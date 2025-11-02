# 🚀 n8n Chatbot Setup Guide

## Quick Start

### Step 1: Update Your .env File

Add this line to your `.env` file:

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/4e5bc752-baf5-47d7-a227-24b7a88552c6
```

### Step 2: Create n8n Workflow

#### Simple Echo Bot

1. Open n8n (http://localhost:5678)
2. Create a new workflow
3. Add these nodes:

**Node 1: Webhook (Trigger)**

- Method: POST
- Path: `webhook-test/4e5bc752-baf5-47d7-a227-24b7a88552c6`
- Response Mode: "Respond to Webhook"

**Node 2: Set (Transform Data)**

- Add this operation:
  - Name: `reply`
  - Value: `You said: {{$json.body}}`

**Node 3: Respond to Webhook**

- Respond With: "Text"
- Response Body: `{{$json.reply}}`

4. Activate the workflow
5. Test the webhook in n8n

### Step 3: Start Your WhatsApp Bot

```bash
npm start
```

### Step 4: Test

1. Scan QR code to connect WhatsApp
2. Send a message to your bot from another WhatsApp number
3. Bot will reply with "You said: [your message]"

---

## 🤖 Advanced Examples

### Example 1: AI Chatbot with OpenAI

**Nodes:**

1. Webhook (Trigger)
2. OpenAI (ChatGPT)
   - Prompt: `{{$json.body}}`
   - Model: gpt-3.5-turbo
3. Set
   - reply: `{{$json.message.content}}`
4. Respond to Webhook

### Example 2: Command-Based Bot

**Nodes:**

1. Webhook (Trigger)
2. Switch (Route by message)
   - Mode: "Rules"
   - Rules:
     - `{{$json.body}}` equals "/help" → Route 0
     - `{{$json.body}}` equals "/status" → Route 1
     - Everything else → Route 2
3. Set (Help)
   - reply: "Commands: /help, /status, /info"
4. Set (Status)
   - reply: "Bot is running! ✅"
5. Set (Default)
   - reply: "Unknown command. Send /help for commands."
6. Respond to Webhook

### Example 3: Save to Database

**Nodes:**

1. Webhook (Trigger)
2. MySQL/PostgreSQL (Insert)
   - Table: messages
   - Columns: from, message, timestamp
3. Set
   - reply: "Message saved!"
4. Respond to Webhook

---

## 📊 Webhook Data Structure

When a user sends a message, n8n receives:

```json
{
  "messageId": "3EB0F1D5C2B5E3C8C7A3@s.whatsapp.net",
  "from": "919876543210@c.us",
  "fromName": "John Doe",
  "body": "Hello bot!",
  "timestamp": 1699000000,
  "isGroup": false,
  "chatName": "John Doe",
  "type": "chat",
  "hasMedia": false
}
```

### Available Fields

| Field       | Type    | Example               | Description           |
| ----------- | ------- | --------------------- | --------------------- |
| `messageId` | string  | `"3EB0..."`           | Unique message ID     |
| `from`      | string  | `"919876543210@c.us"` | Sender's WhatsApp ID  |
| `fromName`  | string  | `"John Doe"`          | Sender's display name |
| `body`      | string  | `"Hello bot!"`        | Message text          |
| `timestamp` | number  | `1699000000`          | Unix timestamp        |
| `isGroup`   | boolean | `false`               | Is from group chat?   |
| `chatName`  | string  | `"John Doe"`          | Chat/Group name       |
| `type`      | string  | `"chat"`              | Message type          |
| `hasMedia`  | boolean | `false`               | Has media attached?   |

---

## 🔧 n8n Expressions

Use these in your n8n nodes:

```javascript
// Get message text
{
  {
    $json.body;
  }
}

// Get sender name
{
  {
    $json.fromName;
  }
}

// Get sender phone (clean)
{
  {
    $json.from.split("@")[0];
  }
}

// Check if message contains word
{
  {
    $json.body.toLowerCase().includes("hello");
  }
}

// Get timestamp as date
{
  {
    new Date($json.timestamp * 1000);
  }
}

// Is from specific user
{
  {
    $json.from === "919876543210@c.us";
  }
}
```

---

## 🛠️ Troubleshooting

### Bot not responding?

1. **Check n8n is running**

   ```bash
   # Should show workflow executed
   ```

2. **Check webhook URL in .env**

   ```env
   N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/YOUR-UUID
   ```

3. **Check n8n workflow is activated**

   - Toggle should be ON (green)

4. **Check console logs**
   ```bash
   # Should show:
   📥 Incoming message from: John Doe
   📝 Message: Hello
   🔄 Sending to n8n...
   ✅ n8n response received
   💬 Sending reply: ...
   ✅ Reply sent successfully
   ```

### Error: ECONNREFUSED

❌ **Problem:** Cannot connect to n8n
✅ **Solution:**

- Make sure n8n is running on port 5678
- Check if webhook URL is correct

### Error: Timeout

❌ **Problem:** n8n taking too long
✅ **Solution:**

- Simplify your workflow
- Check if external APIs are responding
- Default timeout is 30 seconds

### No reply field in response

❌ **Problem:** n8n not returning `reply` or `message`
✅ **Solution:**

- Add "Respond to Webhook" node
- Return JSON with `reply` field:

```json
{
  "reply": "Your message here"
}
```

---

## 📝 Tips

1. **Test webhook in n8n first** before testing with WhatsApp
2. **Use n8n's debug mode** to see incoming data
3. **Start simple** (echo bot) then add complexity
4. **Check console logs** for detailed error messages
5. **Use environment variables** for sensitive data

---

## 🎯 Production Deployment

### For Production n8n:

1. Get your production webhook URL
2. Update `.env`:

```env
N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook/YOUR-UUID
```

3. Use HTTPS for security
4. Add authentication if needed

### Environment Variables:

```env
# Development
N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/4e5bc752-baf5-47d7-a227-24b7a88552c6

# Production
N8N_WEBHOOK_URL=https://n8n.yourdomain.com/webhook/4e5bc752-baf5-47d7-a227-24b7a88552c6
```

---

## 🔐 Security

1. **Don't expose your webhook URL** publicly
2. **Add authentication** in n8n if needed:
   - Use Header Auth in Webhook node
   - Add Bearer token
3. **Validate incoming data** in n8n
4. **Rate limit** your workflow
5. **Log sensitive operations**

---

## 📚 Resources

- [n8n Documentation](https://docs.n8n.io)
- [WhatsApp Web.js Docs](https://wwebjs.dev)
- [n8n Community](https://community.n8n.io)

---

## ✅ Checklist

- [ ] n8n installed and running
- [ ] Webhook workflow created
- [ ] Workflow activated (green toggle)
- [ ] `.env` file updated with webhook URL
- [ ] WhatsApp bot running
- [ ] QR code scanned
- [ ] Test message sent
- [ ] Bot replied successfully

**Happy Coding! 🚀**
