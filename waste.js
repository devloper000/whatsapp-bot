const { Client, RemoteAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { MongoStore } = require("wwebjs-mongo");
const axios = require("axios");
const {
  isValidPhoneNumber: validatePhoneNumber,
} = require("libphonenumber-js");
const {
  getPuppeteerArgs,
  MAX_RESTART_ATTEMPTS,
} = require("../config/whatsapp");
const {
  generateQRImage,
  broadcastQRUpdate,
  setCurrentQR,
  clearCurrentQR,
} = require("./qr.service");
const UserSession = require("../models/UserSession");

// n8n webhook URL
const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "http://localhost:5678/webhook-test/4e5bc752-baf5-47d7-a227-24b7a88552c6";

let whatsappClient = null;
let isClientReady = false;
let restartAttempts = 0;
let isInitializing = false;
let store = null;

let sessionCheckInterval = null;
let activeSessionsCount = 0;

// At the top of the file, add timeout configuration
// Default TALK_TO_US_TIMEOUT is 5 minutes to match Live Chat expiry behaviour
const TALK_TO_US_TIMEOUT = process.env.TALK_TO_US_TIMEOUT_MINUTES || 5;
const LIVE_CHAT_TIMEOUT = process.env.LIVE_CHAT_TIMEOUT_MINUTES || 3;

/**
 * Start session checker only when needed
 */
function startSessionChecker() {
  if (sessionCheckInterval) {
    console.log("⚠️ Session checker already running");
    return;
  }

  console.log("🚀 Starting session checker...");
  sessionCheckInterval = setInterval(async () => {
    await checkInactiveSessions();

    // SMART: Stop interval if no active sessions
    if (activeSessionsCount === 0) {
      stopSessionChecker();
    }
  }, 60 * 1000); // Check every 60 seconds

  console.log("✅ Session checker started");
}

/**
 * Stop session checker to save resources
 */
function stopSessionChecker() {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
    console.log("🛑 Session checker stopped (no active sessions)");
  }
}

/**
 * Safely send a WhatsApp message to a user by id/number
 * - Normalizes id to @c.us if needed
 * - Resolves numberId via client to ensure deliverability
 */
async function sendDirectMessage(rawUserId, text) {
  if (!whatsappClient || !isClientReady) return false;

  try {
    const userId = String(rawUserId || "").trim();
    if (!userId) return false;

    // If it's a plain number, add @c.us
    const jid = userId.endsWith("@c.us") ? userId : `${userId}@c.us`;

    // Resolve number id (handles LID vs non-LID, and validation)
    const numberId = await whatsappClient.getNumberId(jid);
    const targetId = numberId?._serialized || jid;

    await whatsappClient.sendMessage(targetId, text);
    return true;
  } catch (e) {
    console.error("❌ sendDirectMessage failed:", e.message);
    return false;
  }
}

/**
 * Get or create user session
 * @param {string} userId - WhatsApp user ID
 * @returns {Promise<object>} - User session object
 */
async function getOrCreateUserSession(userId) {
  try {
    let session = await UserSession.findOne({ userId });
    if (!session) {
      session = new UserSession({
        userId,
        liveChatEnabled: false,
        talkToUsSelected: false,
        lastInteraction: new Date(),
      });
      await session.save();
      console.log(`📝 New session created for user: ${userId}`);
    } else {
      // Update last interaction time
      session.lastInteraction = new Date();
      await session.save();
    }
    return session;
  } catch (error) {
    console.error("❌ Error getting user session:", error.message);
    // Return default session object if DB fails
    return {
      userId,
      liveChatEnabled: false,
      talkToUsSelected: false,
      lastInteraction: new Date(),
    };
  }
}

/**
 * Disable Live Chat and reset session for a user
 * @param {string} userId - WhatsApp user ID
 */
async function disableLiveChat(userId) {
  try {
    await UserSession.findOneAndUpdate(
      { userId },
      { liveChatEnabled: false, lastInteraction: new Date() },
      { upsert: true, new: true }
    );

    console.log(`✅ Live Chat disabled for user: ${userId}`);

    // Decrease active count
    activeSessionsCount = Math.max(0, activeSessionsCount - 1);

    // STOP interval if no active sessions
    if (activeSessionsCount === 0 && sessionCheckInterval) {
      stopSessionChecker();
    }
  } catch (error) {
    console.error("❌ Error disabling Live Chat:", error.message);
  }
}

/**
 * Check and disable "Talk To Us" sessions after timeout
 */
async function checkTalkToUsSessions() {
  try {
    const timeoutMs = TALK_TO_US_TIMEOUT * 60 * 1000;
    const timeoutAgo = new Date(Date.now() - timeoutMs);

    // Find Talk To Us sessions that are inactive for specified timeout
    const inactiveTalkToUs = await UserSession.find({
      talkToUsSelected: true,
      lastInteraction: { $lt: timeoutAgo },
    })
      .select("userId lastInteraction")
      .lean();

    if (inactiveTalkToUs.length === 0) {
      return;
    }

    console.log(
      `📊 Found ${inactiveTalkToUs.length} inactive "Talk To Us" sessions (${TALK_TO_US_TIMEOUT} min timeout)`
    );

    // Bulk update - disable Talk To Us
    const userIds = inactiveTalkToUs.map((s) => s.userId);
    await UserSession.updateMany(
      { userId: { $in: userIds } },
      {
        $set: {
          talkToUsSelected: false,
          lastInteraction: new Date(),
        },
      }
    );

    console.log(
      `✅ Disabled ${inactiveTalkToUs.length} "Talk To Us" sessions (${TALK_TO_US_TIMEOUT} min timeout)`
    );

    // Optionally send notification messages
    let successCount = 0;
    let failCount = 0;
    const now = new Date();

    for (const session of inactiveTalkToUs) {
      const timeDiff = Math.floor(
        (now - new Date(session.lastInteraction)) / 1000 / 60
      );

      const expiryMessage = `⏰ *Session Expired*

Your "Talk To Us" request has been automatically cleared due to inactivity (${TALK_TO_US_TIMEOUT} minutes).

🔄 *To start again:*
Send any message or reply with:
*1️⃣* - Talk To Us
*2️⃣* - Live Chat (recommended for information)

Thank you! 😊`;

      try {
        const ok = await sendDirectMessage(session.userId, expiryMessage);
        if (ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (msgError) {
        console.error(
          `❌ Error sending to ${session.userId}:`,
          msgError.message
        );
        failCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(
      `✅ Talk To Us expiry complete: ${successCount} sent, ${failCount} failed`
    );
  } catch (error) {
    console.error("❌ Error checking Talk To Us sessions:", error.message);
  }
}

/**
 * Check and disable Live Chat for inactive users (configurable timeout)
 */
async function checkInactiveSessions() {
  try {
    // Quick count check first (lightweight query)
    activeSessionsCount = await UserSession.countDocuments({
      liveChatEnabled: true,
    });

    // Count Talk To Us sessions too for checking
    const talkToUsCount = await UserSession.countDocuments({
      talkToUsSelected: true,
    });

    // If no active sessions of any type, skip processing
    if (activeSessionsCount === 0 && talkToUsCount === 0) {
      console.log("✅ No active sessions - skipping check");
      return;
    }

    console.log(
      `🔍 Checking ${activeSessionsCount} Live Chat + ${talkToUsCount} Talk To Us sessions...`
    );

    const liveChatTimeoutMs = LIVE_CHAT_TIMEOUT * 60 * 1000;
    const liveChatTimeoutAgo = new Date(Date.now() - liveChatTimeoutMs);
    const now = new Date();

    // Check Live Chat sessions
    const inactiveLiveChatSessions = await UserSession.find({
      liveChatEnabled: true,
      lastInteraction: { $lt: liveChatTimeoutAgo },
    })
      .select("userId lastInteraction")
      .lean();

    if (inactiveLiveChatSessions.length > 0) {
      console.log(
        `📊 Found ${inactiveLiveChatSessions.length} inactive Live Chat sessions`
      );

      // Bulk update first
      const userIds = inactiveLiveChatSessions.map((s) => s.userId);
      await UserSession.updateMany(
        { userId: { $in: userIds } },
        {
          $set: {
            liveChatEnabled: false,
            lastInteraction: now,
          },
        }
      );

      // Send messages
      let successCount = 0;
      let failCount = 0;

      for (const session of inactiveLiveChatSessions) {
        const expiryMessage = `⏰ *Session Expired*

Your Live Chat session has been automatically ended due to inactivity (${LIVE_CHAT_TIMEOUT} minutes).

🔄 *To start again:*
Send any message or reply with:
*1️⃣* - Talk To Us
*2️⃣* - Live Chat (recommended for information)

Thank you for using our service! 😊`;

        try {
          const ok = await sendDirectMessage(session.userId, expiryMessage);
          if (ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (msgError) {
          console.error(
            `❌ Error sending to ${session.userId}:`,
            msgError.message
          );
          failCount++;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log(
        `✅ Live Chat expiry complete: ${successCount} sent, ${failCount} failed`
      );

      // Update active count
      activeSessionsCount = await UserSession.countDocuments({
        liveChatEnabled: true,
      });
    }

    // Check Talk To Us sessions
    await checkTalkToUsSessions();

    // Cleanup old sessions
    await cleanupOldSessionsIfNeeded();

    console.log("⚡ checkInactiveSessions completed");
  } catch (error) {
    console.error("❌ Error checking inactive sessions:", error.message);
  }
}

let lastCleanupTime = Date.now();

async function cleanupOldSessionsIfNeeded() {
  const oneHour = 10 * 60 * 1000;
  const now = Date.now();
  console.log("🚀 ~ cleanupOldSessionsIfNeeded ~ now:", now);

  // Only cleanup once per day
  if (now - lastCleanupTime < oneHour) {
    return;
  }

  try {
    const oneHourAgo = new Date(now - oneHour);
    console.log("🚀 ~ cleanupOldSessionsIfNeeded ~ oneHourAgo:", oneHourAgo);
    const result = await UserSession.deleteMany({
      liveChatEnabled: false,
      lastInteraction: { $lt: oneHourAgo },
    });

    if (result.deletedCount > 0) {
      console.log(`🗑️ Cleaned up ${result.deletedCount} old sessions (>6h)`);
    }

    lastCleanupTime = now;
  } catch (error) {
    console.error("❌ Error cleaning old sessions:", error.message);
  }
}
/**
 * Enable Live Chat for a user
 * @param {string} userId - WhatsApp user ID
 */
async function enableLiveChat(userId) {
  try {
    await UserSession.findOneAndUpdate(
      { userId },
      {
        liveChatEnabled: true,
        talkToUsSelected: false,
        promptedAt: null,
        lastInteraction: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Live Chat enabled for user: ${userId}`);

    // START interval when first user enables live chat
    if (!sessionCheckInterval) {
      startSessionChecker();
    }

    activeSessionsCount++;
  } catch (error) {
    console.error("❌ Error enabling Live Chat:", error.message);
  }
}

async function enableTalkToUs(userId) {
  try {
    await UserSession.findOneAndUpdate(
      { userId },
      {
        liveChatEnabled: false,
        talkToUsSelected: true,
        promptedAt: new Date(),
        lastInteraction: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Talk To Us enabled for user: ${userId}`);

    // START interval when first user enables live chat
    if (!sessionCheckInterval) {
      startSessionChecker();
    }

    activeSessionsCount++;
  } catch (error) {
    console.error("❌ Error enabling Talk To Us:", error.message);
  }
}
/**
 * Send welcome message with interactive buttons/list
 * @param {Message} message - WhatsApp message object
 */
async function sendWelcomeButtons(message) {
  try {
    // WhatsApp-web.js doesn't properly support buttons/list messages anymore
    // So we'll use a well-formatted text message that looks professional
    const welcomeMessage = `👋 *Hello! How can I help you today?*

Please select an option by replying with the number:

*1️⃣ Talk To Us*
Contact our team

*2️⃣ Live Chat* (recommended for information)
Start chatting with our bot

Reply with *1* or *2* to select your option.`;

    await message.reply(welcomeMessage);
    console.log("✅ Welcome message sent (formatted text format)");
  } catch (error) {
    console.error("❌ Error sending welcome message:", error.message);
    // Last resort fallback
    try {
      await message.reply(
        "👋 Hello! How can I help you today?\n\nPlease reply:\n1️⃣ - Talk To Us\n2️⃣ - Live Chat (recommended for information)"
      );
    } catch (fallbackError) {
      console.error(
        "❌ Failed to send fallback message:",
        fallbackError.message
      );
    }
  }
}

/**
 * Handle button click or text-based selection
 * @param {Message} message - WhatsApp message object
 * @param {string} selectedOption - Selected option text or button ID
 */
async function handleUserSelection(message, selectedOption) {
  const userId = message.from;
  const messageBody = message.body?.toLowerCase().trim() || "";
  const selectedOptionLower = selectedOption?.toLowerCase().trim() || "";

  // Check if user clicked a button or typed a selection
  const isLiveChat =
    selectedOptionLower.includes("live_chat") ||
    selectedOptionLower.includes("live chat") ||
    messageBody.includes("live chat") ||
    messageBody.includes("2") ||
    messageBody === "2️⃣" ||
    selectedOptionLower === "live_chat";

  const isTalkToUs =
    selectedOptionLower.includes("talk_to_us") ||
    selectedOptionLower.includes("talk to us") ||
    messageBody.includes("talk to us") ||
    messageBody.includes("1") ||
    messageBody === "1️⃣" ||
    selectedOptionLower === "talk_to_us";

  if (isLiveChat) {
    await enableLiveChat(userId);
    await message.reply(
      "✅ Live Chat enabled! You can now chat with our bot. How can I help you?\n\n💡 Tip: Type *E* to end Live Chat anytime."
    );
    console.log(`✅ User ${userId} selected Live Chat`);
  } else if (isTalkToUs) {
    await enableTalkToUs(userId);
    await message.reply(
      "Thank you for your interest. Our team will contact you soon. \n\nIf you Don't get any Answer to our team.\nType 2️⃣ to start live chart with our assistant."
    );
    console.log(`ℹ️  User ${userId} selected Talk To Us - no action taken`);
  } else {
    // Invalid selection, send buttons again
    await sendWelcomeButtons(message);
  }
}

/**
 * Handle incoming WhatsApp messages and send to n8n
 * @param {Message} message - WhatsApp message object
 */
async function handleIncomingMessage(message) {
  try {
    // Skip if message is from status broadcast
    if (message.from === "status@broadcast") {
      return;
    }

    // Skip group messages
    const chat = await message.getChat();
    if (chat.isGroup) {
      return;
    }

    const userId = message.from;

    // Get user session
    const session = await getOrCreateUserSession(userId);

    // Check if message is a button click (interactive message)
    // Button clicks can be detected by checking message.type or message.body for button IDs
    const messageBody = message.body?.toLowerCase().trim() || "";
    const isButtonClick =
      message.type === "buttons_response" ||
      message.type === "interactive" ||
      message.type === "list_response" ||
      messageBody === "talk_to_us" ||
      messageBody === "live_chat" ||
      message.selectedButtonId ||
      message.selectedRowId;

    // Handle button clicks
    if (isButtonClick) {
      const selectedOption =
        message.selectedButtonId || message.selectedRowId || message.body;
      await handleUserSelection(message, selectedOption);
      return;
    }

    // Check if user has enabled Live Chat
    if (!session.liveChatEnabled) {
      // Check if user is trying to select an option via text
      if (
        messageBody.includes("live chat") ||
        messageBody.includes("talk to us") ||
        messageBody === "1" ||
        messageBody === "2" ||
        messageBody === "1️⃣" ||
        messageBody === "2️⃣"
      ) {
        await handleUserSelection(message, message.body);
        return;
      }

      // If user had selected Talk To Us before, check expiry similarly to Live Chat
      if (session.talkToUsSelected) {
        try {
          const lastInteraction = new Date(
            session.lastInteraction || Date.now()
          );
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

          // If Talk To Us session is older than 5 minutes, expire it and notify user
          if (lastInteraction < fiveMinutesAgo) {
            // Disable Talk To Us and update timestamps
            await UserSession.findOneAndUpdate(
              { userId },
              {
                talkToUsSelected: false,
                lastInteraction: new Date(),
                promptedAt: new Date(),
              },
              { upsert: true }
            );

            const expiryMessage = `⏰ *Session Expired*\n\nYour "Talk To Us" request has been automatically cleared due to inactivity (5 minutes).\n\n🔄 *To start again:*\nSend any message or reply with:\n*1️⃣* - Talk To Us\n*2️⃣* - Live Chat (recommended for information)\n\nThank you! 😊`;

            try {
              await message.reply(expiryMessage);
              console.log(
                `⏰ Talk To Us expired for user ${userId} due to inactivity`
              );
            } catch (replyErr) {
              console.error(
                `❌ Failed to send Talk To Us expiry message to ${userId}:`,
                replyErr.message
              );
            }

            // Do not prompt again immediately
            return;
          }
        } catch (err) {
          console.error("❌ Error checking Talk To Us expiry:", err.message);
          // If anything goes wrong, fall back to staying silent
          return;
        }
        // If not expired, stay silent
        return;
      }

      // Rate-limit the welcome prompt: only send if never sent or older than 5 minutes
      const now = Date.now();
      const promptedAtTs = session.promptedAt
        ? new Date(session.promptedAt).getTime()
        : 0;
      const fiveMinutesMs = 5 * 60 * 1000;
      if (!promptedAtTs || now - promptedAtTs > fiveMinutesMs) {
        await sendWelcomeButtons(message);
        await UserSession.findOneAndUpdate(
          { userId },
          { promptedAt: new Date(), lastInteraction: new Date() },
          { upsert: true }
        );
      }
      return;
    }

    // Check if user wants to end Live Chat (E command)
    if (messageBody === "e" || messageBody === "E") {
      await disableLiveChat(userId);
      await message.reply(
        "✅ Live Chat ended.\n\n💡 Tip: Send a message anytime to start again! \n\nType *1️⃣* to Talk To Us \nType *2️⃣* to start Live Chat again."
      );
      console.log(`🛑 User ${userId} ended Live Chat`);
      return;
    }

    // Check if session is inactive (5 minutes timeout)
    const lastInteraction = new Date(session.lastInteraction);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    if (lastInteraction < fiveMinutesAgo) {
      await disableLiveChat(userId);
      await message.reply(
        "⏰ *Session Expired*\n\nYour Live Chat session has been automatically ended due to inactivity (5 minutes).\n\n🔄 *To start again:*\nSend any message or reply with:\n*1️⃣* - Talk To Us\n*2️⃣* - Live Chat (recommended for information)\n\nThank you for using our service! 😊"
      );
      console.log(`⏰ Live Chat expired for user ${userId} due to inactivity`);
      // Mark prompt suppression to avoid immediate re-prompt spam
      await UserSession.findOneAndUpdate(
        { userId },
        { promptedAt: new Date() },
        { upsert: true }
      );
      return;
    }

    // User has Live Chat enabled - proceed with n8n integration
    const contact = await message.getContact();

    // Update lastInteraction timestamp for active session
    await UserSession.findOneAndUpdate(
      { userId },
      { lastInteraction: new Date() },
      { upsert: true }
    );

    // Prepare data to send to n8n
    const webhookData = {
      messageId: message.id._serialized,
      from: message.from,
      fromName: contact.name || contact.pushname || message.from,
      body: message.body,
      timestamp: message.timestamp,
      isGroup: chat.isGroup,
      chatName: chat.name,
      type: message.type, // text, image, video, audio, etc.
      hasMedia: message.hasMedia,
    };

    console.log("📥 Incoming message from:", webhookData.fromName);
    console.log("📝 Message:", message.body);

    // Send to n8n webhook
    console.log("🔄 Sending to n8n...");
    const response = await axios.post(N8N_WEBHOOK_URL, webhookData, {
      timeout: 30000, // 30 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log("🚀 ~ handleIncomingMessage ~ response:", response.data);

    console.log("✅ n8n response received");

    // Check if n8n returned a reply message
    if (response.data) {
      // Handle string response
      if (typeof response.data === "string") {
        console.log("💬 Sending message:", response.data);
        await message.reply(response.data);
        console.log("✅ Message sent successfully");
      }
      // Handle object response (could have message field)
      else if (response.data.message || response.data.reply) {
        const replyMessage = response.data.message || response.data.reply;
        console.log("💬 Sending message:", replyMessage);
        await message.reply(replyMessage);
        console.log("✅ Message sent successfully");
      } else {
        console.log("ℹ️  No reply message in n8n response");
      }
    } else {
      console.log("ℹ️  No reply message in n8n response");
    }
  } catch (error) {
    console.error("❌ Error handling message:", error.message);

    // Send error message to user (optional)
    try {
      if (error.code === "ECONNREFUSED") {
        console.error("❌ Cannot connect to n8n webhook - is n8n running?");
        await message.reply(
          "⚠️ Bot service temporarily unavailable. Please try again later. \n\n Type *E* to end Live Chat Then\nType *1️⃣* to Talk To Us (We will reply to you as soon as possible)"
        );
      } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        console.error("❌ n8n webhook timeout");
        await message.reply(
          "⚠️ Response timeout. Please try again. \n\n Type *E* to end Live Chat Then\nType *1️⃣* to Talk To Us (We will reply to you as soon as possible)"
        );
      }
    } catch (replyError) {
      console.error("❌ Failed to send error message:", replyError.message);
    }
  }
}

/**
 * Initialize WhatsApp Client
 * @param {MongoStore} mongoStore - MongoDB store instance
 */
function initializeWhatsAppClient(mongoStore) {
  if (!mongoStore) {
    console.error("❌ Store not initialized. Cannot create WhatsApp client.");
    return;
  }

  if (isInitializing) {
    console.log("⏳ Client initialization already in progress, skipping...");
    return;
  }

  store = mongoStore;
  isInitializing = true;
  restartAttempts = 0;

  console.log("🚀 Initializing WhatsApp Client with MongoDB session store...");

  const client = new Client({
    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 300000, // 5 minutes
    }),
    puppeteer: {
      headless: true,
      args: getPuppeteerArgs(),
    },
  });

  // Ensure TTL index is 5 minutes on UserSession.lastInteraction
  async function removeUserSessionTTLIndex() {
    try {
      const indexes = await UserSession.collection.indexes();
      const ttlIndex = indexes.find(
        (idx) => idx.key && idx.key.lastInteraction && idx.expireAfterSeconds
      );
      console.log("🚀 ~ removeUserSessionTTLIndex ~ ttlIndex:", ttlIndex);

      if (ttlIndex) {
        console.log(`🗑️ Removing TTL index: ${ttlIndex.name}`);
        await UserSession.collection.dropIndex(ttlIndex.name);
        console.log("✅ TTL index removed - manual expiry handling enabled");
      } else {
        console.log("✅ No TTL index found - manual expiry already enabled");
      }
    } catch (e) {
      console.log("⚠️ Could not remove TTL index:", e.message);
    }
  }

  // QR Code Generation
  client.on("qr", async (qr) => {
    console.log("🔗 QR RECEIVED - Session failed to load, need to scan QR:");
    console.log("📱 QR Code for WhatsApp Web:");
    qrcode.generate(qr, { small: true });

    // Generate QR image for web display
    const qrImage = await generateQRImage(qr);
    setCurrentQR(qr, qrImage);

    // Broadcast to all connected clients
    broadcastQRUpdate(qrImage, "qr_ready");
  });

  // Remote session saved event
  client.on("remote_session_saved", () => {
    console.log("💾 Session saved to MongoDB successfully!");
  });

  // Remote session failed to save event
  client.on("remote_session_failed", (error) => {
    console.error("❌ Failed to save session to MongoDB:", error);
  });

  // Remote session loaded event
  client.on("remote_session_loaded", () => {
    console.log("📂 Session loaded from MongoDB successfully!");
    clearCurrentQR();
    broadcastQRUpdate(null, "session_loaded");
  });

  // Remote session failed to load event
  client.on("remote_session_failed", (error) => {
    console.error("❌ Failed to load session from MongoDB:", error);
  });

  // Loading screen events for debugging
  client.on("loading_screen", (percent, message) => {
    console.log(`📱 Loading: ${percent}% - ${message}`);
  });

  // Client Ready
  client.on("ready", async () => {
    console.log("✅ WhatsApp Web.js Client is Ready!");
    whatsappClient = client;
    isClientReady = true;
    isInitializing = false;
    clearCurrentQR();
    broadcastQRUpdate(null, "ready");

    // Remove TTL index
    await removeUserSessionTTLIndex();

    // Count active sessions on startup
    // Count active sessions on startup
    try {
      activeSessionsCount = await UserSession.countDocuments({
        liveChatEnabled: true,
      });

      const talkToUsCount = await UserSession.countDocuments({
        talkToUsSelected: true,
      });

      console.log(
        `📊 Found ${activeSessionsCount} Live Chat + ${talkToUsCount} Talk To Us sessions on startup`
      );

      // Only start checker if there are active sessions of any type
      if (activeSessionsCount > 0 || talkToUsCount > 0) {
        startSessionChecker();

        // Run immediate check for startup
        setTimeout(() => {
          checkInactiveSessions().catch((err) => {
            console.error("❌ Initial check failed:", err.message);
          });
        }, 3000);
      } else {
        console.log("✅ No active sessions - checker will start when needed");
      }
    } catch (error) {
      console.error("❌ Error counting active sessions:", error.message);
    }
  });

  // Message Handler - Listen for incoming messages
  client.on("message", async (message) => {
    await handleIncomingMessage(message);
  });

  // Authentication Success
  client.on("authenticated", () => {
    console.log("🔐 Authentication successful!");
    broadcastQRUpdate(null, "authenticated");
  });

  // Authentication Failure
  client.on("auth_failure", (msg) => {
    console.error("❌ Authentication failure:", msg);
    broadcastQRUpdate(null, "auth_failure");
  });

  // Client Disconnected
  client.on("disconnected", (reason) => {
    console.log("📱 Client was logged out:", reason);
    isClientReady = false;
    whatsappClient = null;
    isInitializing = false;

    // Attempt to restart the client after a delay
    if (restartAttempts < MAX_RESTART_ATTEMPTS) {
      restartAttempts++;
      setTimeout(() => {
        console.log(
          `🔄 Attempting to restart WhatsApp client... (Attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})`
        );
        initializeWhatsAppClient(store);
      }, 5000);
    } else {
      console.error(
        "❌ Maximum restart attempts reached. Please restart the application manually."
      );
    }
  });

  // Handle critical errors
  client.on("change_state", (state) => {
    console.log("🔄 Client state changed to:", state);
    if (state === "CONFLICT" || state === "UNPAIRED") {
      console.log(
        "⚠️  Client in conflict or unpaired state, attempting restart..."
      );
      isClientReady = false;
      whatsappClient = null;
      isInitializing = false;
      if (restartAttempts < MAX_RESTART_ATTEMPTS) {
        restartAttempts++;
        setTimeout(() => {
          console.log(
            `🔄 Attempting to restart WhatsApp client... (Attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})`
          );
          initializeWhatsAppClient(store);
        }, 10000);
      } else {
        console.error(
          "❌ Maximum restart attempts reached. Please restart the application manually."
        );
      }
    }
  });

  // Initialize Client with error handling
  client.initialize().catch((error) => {
    console.error("❌ Failed to initialize WhatsApp client:", error);
    isInitializing = false;

    // Handle specific Puppeteer errors
    if (
      error.message.includes("Protocol error") ||
      error.message.includes("Execution context was destroyed") ||
      error.message.includes("Target closed") ||
      error.message.includes("Session closed")
    ) {
      console.log(
        "🔄 Puppeteer error detected, attempting restart in 10 seconds..."
      );
      if (restartAttempts < MAX_RESTART_ATTEMPTS) {
        restartAttempts++;
        setTimeout(() => {
          console.log(
            `🔄 Attempting to restart WhatsApp client... (Attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})`
          );
          initializeWhatsAppClient(store);
        }, 10000);
      } else {
        console.error(
          "❌ Maximum restart attempts reached. Please restart the application manually."
        );
      }
    }
  });
}

/**
 * Check if number exists on WhatsApp
 * @param {string} phoneNumber - Phone number in WhatsApp format
 * @returns {Promise<boolean>} - True if number exists
 */
async function checkNumberExists(phoneNumber) {
  try {
    if (!whatsappClient) {
      return false;
    }
    const numberId = await whatsappClient.getNumberId(phoneNumber);
    return numberId !== null;
  } catch (error) {
    console.log(`❌ Number check failed for ${phoneNumber}:`, error.message);
    return false;
  }
}

/**
 * Get contact details by phone number
 * @param {string} phoneNumber - Phone number in WhatsApp format (e.g., 923001234567@c.us)
 * @returns {Promise<object|null>} - Contact details or null if not found
 */
async function getContactDetails(phoneNumber) {
  try {
    if (!whatsappClient) {
      return null;
    }

    // Get number ID first
    const numberId = await whatsappClient.getNumberId(phoneNumber);
    if (!numberId) {
      return null;
    }

    // Get contact details
    const contact = await whatsappClient.getContactById(numberId._serialized);

    if (!contact) {
      return null;
    }

    // Get profile picture URL
    let profilePicUrl = null;
    try {
      const profilePic = await contact.getProfilePicUrl();
      profilePicUrl = profilePic || null;
    } catch (picError) {
      // Profile picture not available or error fetching
      profilePicUrl = null;
    }

    // Try to get name using different methods
    let contactName = null;
    let pushname = null;

    // Try direct property access
    if (contact.name) {
      contactName = contact.name;
    }
    if (contact.pushname) {
      pushname = contact.pushname;
    }

    // Try getName() method if available
    if (!contactName && typeof contact.getName === "function") {
      try {
        contactName = contact.getName();
      } catch (e) {
        // Ignore error
      }
    }

    // Use pushname as fallback for name
    if (!contactName && pushname) {
      contactName = pushname;
    }

    // If still no name, try to get from number
    if (!contactName && !pushname) {
      // Last resort - use number as identifier
      contactName = contact.number || contact.id?.user || "Unknown";
    }

    // Format contact details
    const contactDetails = {
      number: contact.number || contact.id?.user || null,
      id: contact.id?._serialized || null,
      name: contactName,
      pushname: pushname || contactName || null,
      shortName: contact.shortName || null,
      isMyContact: contact.isMyContact || false,
      isBusiness: contact.isBusiness || false,
      isUser: contact.isUser || false,
      profilePicUrl: profilePicUrl,
      // Additional metadata
      isVerified: contact.isVerified || false,
      isEnterprise: contact.isEnterprise || false,
    };

    return contactDetails;
  } catch (error) {
    console.log(
      `❌ Error getting contact details for ${phoneNumber}:`,
      error.message
    );
    return null;
  }
}

/**
 * Send message via WhatsApp
 * @param {string} phoneNumber - Phone number in WhatsApp format
 * @param {string} message - Message to send
 * @returns {Promise<object>} - Result object
 */
async function sendMessage(phoneNumber, message) {
  if (!whatsappClient || !isClientReady) {
    throw new Error("WhatsApp client not ready");
  }

  return await whatsappClient.sendMessage(phoneNumber, message.trim());
}

/**
 * Get client instance
 * @returns {Client|null} - WhatsApp client instance
 */
function getClient() {
  return whatsappClient;
}

/**
 * Check if client is ready
 * @returns {boolean} - True if client is ready
 */
function isReady() {
  return isClientReady;
}

/**
 * Validate if phone number is valid using libphonenumber-js
 * @param {string} number - Phone number to validate
 * @returns {boolean} - True if valid
 */
function isValidPhoneNumber(number) {
  if (!number) return false;

  try {
    // Convert to string and trim
    const phoneStr = String(number).trim();

    if (!phoneStr) return false;

    // Try validating with '+' prefix (E.164 format)
    if (validatePhoneNumber(`+${phoneStr}`)) {
      return true;
    }

    // Try validating without '+' prefix (WhatsApp format)
    if (validatePhoneNumber(phoneStr)) {
      return true;
    }

    // Try validating with default country code (PK) for local numbers
    if (validatePhoneNumber(phoneStr, "PK")) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Get all contacts from WhatsApp with filtering options
 * @param {Object} options - Filtering options
 * @param {boolean} options.savedOnly - Only return saved contacts (default: false)
 * @param {boolean} options.excludeUnknown - Exclude contacts with "Unknown" name (default: false)
 * @param {boolean} options.validateNumber - Validate phone number format (default: true)
 * @returns {Promise<Array>} - Array of contacts with numbers and names
 */
async function getAllContacts(options = {}) {
  if (!whatsappClient || !isClientReady) {
    throw new Error("WhatsApp client not ready");
  }

  // Default options
  const {
    savedOnly = false,
    excludeUnknown = false,
    validateNumber = true,
  } = options;

  try {
    const contacts = await whatsappClient.getContacts();

    // Filter and format contacts
    const formattedContacts = contacts
      .filter((contact) => {
        // Filter out group chats, broadcast lists, status, and LID entries
        // Only keep standard WhatsApp numbers (@c.us format)
        if (
          !contact.isUser ||
          contact.isGroup ||
          contact.isBroadcast ||
          contact.id._serialized === "status@broadcast" ||
          !contact.id._serialized.endsWith("@c.us")
        ) {
          return false;
        }

        // Filter: Only saved contacts
        if (savedOnly && !contact.isMyContact) {
          return false;
        }

        // Filter: Validate phone number
        if (validateNumber) {
          const number = contact.number || contact.id.user;
          if (!isValidPhoneNumber(number)) {
            return false;
          }
        }

        return true;
      })
      .map((contact) => ({
        name: contact.name || contact.pushname || "Unknown",
        number: contact.number || contact.id.user,
        id: contact.id._serialized,
        isMyContact: contact.isMyContact,
        isBusiness: contact.isBusiness,
        shortName: contact.shortName || null,
      }))
      .filter((contact) => {
        // Filter: Exclude unknown names (applied after mapping)
        if (excludeUnknown && contact.name === "Unknown") {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by name alphabetically
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

    return formattedContacts;
  } catch (error) {
    console.error("❌ Error fetching contacts:", error.message);
    throw error;
  }
}

module.exports = {
  initializeWhatsAppClient,
  checkNumberExists,
  getContactDetails,
  sendMessage,
  getClient,
  isReady,
  getAllContacts,
};
