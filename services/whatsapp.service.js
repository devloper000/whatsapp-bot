const { Client, RemoteAuth } = require("whatsapp-web.js");
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

// n8n webhook URL
const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "http://localhost:5678/webhook-test/4e5bc752-baf5-47d7-a227-24b7a88552c6";

let whatsappClient = null;
let isClientReady = false;
let restartAttempts = 0;
let isInitializing = false;
let store = null;

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

    // Get sender info
    const contact = await message.getContact();
    const chat = await message.getChat();

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
      // Alternative field name
      console.log("💬 Sending message:", response.data);
      await message.reply(response.data);
      console.log("✅ Message sent successfully");
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
          "⚠️ Bot service temporarily unavailable. Please try again later."
        );
      } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        console.error("❌ n8n webhook timeout");
        await message.reply("⚠️ Response timeout. Please try again.");
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
  client.on("ready", () => {
    console.log("✅ WhatsApp Web.js Client is Ready!");
    whatsappClient = client;
    isClientReady = true;
    isInitializing = false;
    clearCurrentQR();
    broadcastQRUpdate(null, "ready");
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
