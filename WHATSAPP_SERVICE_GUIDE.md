# WhatsApp Service Code Guide & Review

This document provides a deep dive into the `services/whatsapp.service.js` file. It explains how the code works, its architecture, and the logic flow for handling messages and sessions.

## 1. Overview (Project Ka Overview)
This file is the **core engine** of your WhatsApp bot. It connects to WhatsApp using `whatsapp-web.js`, manages user sessions (saving them to MongoDB), and acts as a bridge between WhatsApp users and your automation logic (n8n).

**Main Responsibilities:**
-   **WhatsApp Connection:** Logs in, handles QR codes, and maintains the connection.
-   **Session Management:** Remembers if a user is in "Live Chat" or "Talk To Us" mode.
-   **Message Routing:** Decides whether to reply automatically or forward the message to n8n.
-   **Cleanup:** Automatically closes old/inactive sessions to save resources.

---

## 2. Key Technologies & Libraries
-   **`whatsapp-web.js`**: The library that powers the WhatsApp automation (runs a hidden browser).
-   **`wwebjs-mongo`**: Saves the WhatsApp session (login credentials) to MongoDB so you don't have to scan the QR code every time you restart.
-   **`UserSession` (Mongoose Model)**: A database model used to track each user's state (e.g., are they chatting with the bot? When did they last reply?).
-   **`axios`**: Used to send data to your n8n webhook.

---

## 3. Logic Flow (Kaam Kaise Karta Hai)

### A. Initialization (`initializeWhatsAppClient`)
1.  **Starts the Client**: Launches the WhatsApp client with MongoDB authentication.
2.  **Event Listeners**: Sets up "ears" to listen for events:
    -   `qr`: If not logged in, generates a QR code.
    -   `ready`: When connected successfully.
    -   `message`: When a new message arrives.
3.  **Auto-Restart**: If the connection fails or Puppeteer crashes, it automatically tries to restart (up to `MAX_RESTART_ATTEMPTS`).

### B. Message Handling (`handleIncomingMessage`)
This is the most important function. Here is the step-by-step flow when a message arrives:

1.  **Filter**: Ignores Status updates (`status@broadcast`) and Group messages.
2.  **Get Session**: Checks the database (`UserSession`) for the user. If they are new, creates a new session.
3.  **Check for Buttons/Commands**:
    -   Did the user click "Live Chat" or "Talk To Us"?
    -   Did they type "1" or "2"?
    -   **If YES**: Calls `handleUserSelection` to switch their mode.
4.  **Mode Check**:
    -   **If "Live Chat" is Enabled**:
        -   Forwards the message to **n8n** (`N8N_WEBHOOK_URL`).
        -   Waits for n8n to reply.
        -   Sends the n8n reply back to the user.
        -   *Exit Command*: If user types "e", it ends Live Chat.
    -   **If "Talk To Us" is Selected**:
        -   Checks if the session has expired (2 minutes).
        -   If active, it just updates the "Last Interaction" time.
    -   **If No Mode (Default)**:
        -   Sends the **Welcome Menu** (Buttons: 1. Talk To Us, 2. Live Chat).
        -   *Rate Limit*: Ensures the welcome message isn't sent too often (checks `promptedAt`).

### C. Session Management (Session Kaise Manage Hota Hai)
The code is very careful about cleaning up old data.

-   **Session Checker (`checkInactiveSessions`)**:
    -   Runs every **60 seconds**.
    -   Checks if a user hasn't replied in **2 minutes** (`SESSION_TIMEOUT_MINUTES`).
    -   If timed out, it sends a "Session Expired" message and resets their state.
-   **Deep Cleanup (`cleanupOldSessions`)**:
    -   Runs every **30 minutes**.
    -   Deletes sessions from the database that have been inactive for **1 hour**. This keeps your database small and fast.

---

## 4. Detailed Function Breakdown

| Function Name | Description |
| :--- | :--- |
| `initializeWhatsAppClient` | Starts the bot, sets up auth, and handles connection errors. |
| `handleIncomingMessage` | The "Traffic Cop". Decides where every message goes (n8n, welcome menu, or command handler). |
| `handleUserSelection` | Logic for when a user clicks a button. Enables "Live Chat" or "Talk To Us" modes. |
| `sendWelcomeButtons` | Sends the main menu ("Hello! How can I help you today?"). |
| `checkInactiveSessions` | The "Watchdog". Finds users who stopped replying and kicks them out of Live Chat after 2 mins. |
| `sendDirectMessage` | A helper to send a message to any number (used for expiry notifications). |
| `getAllContacts` | Fetches and filters your WhatsApp contacts (useful for other features). |

---

## 5. Configuration (Settings)
You can tweak these values in the code to change behavior:

-   **`SESSION_TIMEOUT_MINUTES = 2`**: How long a user can stay in Live Chat without replying before being kicked out.
-   **`SESSION_CLEANUP_HOURS = 1`**: How long to keep user data in the database before deleting it.
-   **`N8N_WEBHOOK_URL`**: The link where messages are sent for processing. currently defaults to a localhost URL if not set in env.

## 6. Suggestions / Improvements
1.  **Webhook URL**: Ensure `process.env.N8N_WEBHOOK_URL` is set in your `.env` file so you don't rely on the hardcoded localhost URL.
2.  **Error Handling**: The n8n request has a 30-second timeout. If n8n is slow, the user sees an error. Ensure your n8n workflow is fast.
