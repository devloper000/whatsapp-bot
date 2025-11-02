📁 Project Root/
├── 📄 server.js # Main server entry point
├── 📄 app.js # Express app configuration
├── 📁 config/ # Configuration files
│ ├── database.js # MongoDB connection
│ └── whatsapp.js # WhatsApp client config
├── 📁 services/ # Business logic services
│ ├── whatsapp.service.js # WhatsApp client management
│ └── qr.service.js # QR code generation & broadcasting
├── 📁 controllers/ # Route controllers
│ ├── qr.controller.js # QR page & stream handlers
│ ├── message.controller.js # Message sending logic
│ └── status.controller.js # Status & health endpoints
├── 📁 routes/ # Route definitions
│ ├── index.js # Main router
│ ├── qr.routes.js # QR routes
│ ├── message.routes.js # Message routes
│ └── status.routes.js # Status routes
├── 📁 middleware/ # Middleware
│ └── errorHandler.js # Error handling
└── 📁 utils/ # Utility functions
└── phoneNumber.js # Phone number normalization

## 🤖 WhatsApp Chatbot with n8n Integration

This project now supports automatic chatbot functionality using n8n webhooks!

### How it Works

1. **User sends a message** to your WhatsApp number
2. **Bot forwards the message** to n8n webhook
3. **n8n processes** the message (you can add AI, database queries, etc.)
4. **n8n returns a response** to the bot
5. **Bot replies** to the user automatically

### Setup Instructions

#### 1. Configure Environment Variable

Add to your `.env` file:

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/4e5bc752-baf5-47d7-a227-24b7a88552c6
```

#### 2. n8n Workflow Setup

Create a workflow in n8n with a **Webhook node**:

**Incoming Data Format:**

```json
{
  "messageId": "string",
  "from": "string",
  "fromName": "string",
  "body": "string",
  "timestamp": "number",
  "isGroup": "boolean",
  "chatName": "string",
  "type": "text|image|video|audio",
  "hasMedia": "boolean"
}
```

**Response Format:**
Your n8n workflow must return JSON with a `reply` or `message` field:

```json
{
  "reply": "Your response message here"
}
```

#### 3. Example n8n Workflow

Simple echo bot:

1. **Webhook Node** (Trigger)
2. **Function Node** (Process):

```javascript
return {
  reply: `You said: ${$json.body}`,
};
```

3. **Respond to Webhook** (Return reply)

#### 4. Advanced Features

**With AI (ChatGPT):**

- Add OpenAI node after webhook
- Pass `body` to ChatGPT
- Return AI response

**With Database:**

- Query database based on message
- Return personalized responses

**With Conditions:**

- Route messages based on keywords
- Different responses for different users

### Message Data Fields

| Field       | Type    | Description                      |
| ----------- | ------- | -------------------------------- |
| `messageId` | string  | Unique message identifier        |
| `from`      | string  | Sender's WhatsApp ID             |
| `fromName`  | string  | Sender's display name            |
| `body`      | string  | Message text content             |
| `timestamp` | number  | Message timestamp                |
| `isGroup`   | boolean | Is from a group chat             |
| `chatName`  | string  | Name of chat/group               |
| `type`      | string  | Message type (text, image, etc.) |
| `hasMedia`  | boolean | Contains media attachment        |

### Error Handling

The bot automatically handles:

- ✅ Connection errors (n8n offline)
- ✅ Timeout errors (30s timeout)
- ✅ Invalid responses
- ✅ User receives error messages

### Testing

1. Start your n8n workflow
2. Send a WhatsApp message to your bot
3. Check n8n logs for incoming data
4. Bot will reply with n8n's response
