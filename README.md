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
│ ├── contact.controller.js # Contact fetching logic
│ ├── number-checker.controller.js # Number checking logic
│ └── status.controller.js # Status & health endpoints
├── 📁 routes/ # Route definitions
│ ├── index.js # Main router
│ ├── qr.routes.js # QR routes
│ ├── message.routes.js # Message routes
│ ├── contact.routes.js # Contact routes
│ ├── number-checker.routes.js # Number checker routes
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

---

## 📇 Contacts API

### New Feature: Fetch All WhatsApp Contacts!

Jab aap QR code scan kar lete ho, to aap apne WhatsApp account ke **saare contacts** ko fetch kar sakte ho!

### Endpoints:

#### 1. Get All Contacts

```bash
GET http://localhost:3000/contacts

# With Filters (Recommended - No fake contacts!)
GET http://localhost:3000/contacts?savedOnly=true
GET http://localhost:3000/contacts?savedOnly=true&excludeUnknown=true
```

**Response:**

```json
{
  "success": true,
  "total": 150,
  "contacts": [
    {
      "name": "Ahmed Ali",
      "number": "923001234567",
      "isMyContact": true,
      "isBusiness": false
    }
  ]
}
```

#### Filtering Options (Fake Contacts Ko Hatane Ke Liye)

- `?savedOnly=true` - Sirf saved contacts (fake nahi aayenge) ⭐ **Recommended**
- `?excludeUnknown=true` - "Unknown" name wale contacts filter ho jayenge
- `?validateNumber=true` - Invalid numbers filter (default: enabled)

---

#### 📥 CSV Export - Download Contacts as File!

**NEW FEATURE:** Ab aap contacts ko CSV file mein download kar sakte ho!

```bash
# Download CSV file with all contacts
GET http://localhost:3000/contacts/export

# Download only saved contacts (Recommended!)
GET http://localhost:3000/contacts/export?savedOnly=true

# Download with filters
GET http://localhost:3000/contacts/export?savedOnly=true&excludeUnknown=true
```

**Browser mein open karo aur file automatically download ho jayegi!** 💾

**File Format:** CSV (Excel/Google Sheets mein open kar sakte ho)

**Filename Example:** `whatsapp_contacts_saved_2025-11-02T10-30-45.csv`

---

#### 2. Get Contact Statistics

```bash
GET http://localhost:3000/contacts/stats
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "total": 150,
    "saved": 120,
    "unsaved": 30,
    "business": 25,
    "regular": 125
  }
}
```

### 📖 Complete Documentation

- **[CSV_EXPORT_GUIDE.md](./CSV_EXPORT_GUIDE.md)** - 📥 CSV Export Guide
- **[CONTACTS_API.md](./CONTACTS_API.md)** - Complete API documentation
- **[FILTERING_GUIDE.md](./FILTERING_GUIDE.md)** - Filtering fake contacts guide
- **[NUMBER_CHECKER_GUIDE.md](./NUMBER_CHECKER_GUIDE.md)** - 🔍 Number Checker Guide (NEW!)

### Features:

- ✅ Fetch all contacts from WhatsApp
- ✅ **📥 Export contacts as CSV file**
- ✅ **🔍 Check which numbers are on WhatsApp** (NEW!)
- ✅ **Filter fake/spam contacts** (`savedOnly=true`)
- ✅ Filter by saved/unsaved
- ✅ Identify business accounts
- ✅ Exclude "Unknown" names
- ✅ Phone number validation
- ✅ Get contact statistics
- ✅ Web interface for easy export
- ✅ Sorted alphabetically
- ✅ No groups or broadcasts
- ✅ No duplicate contacts

---

## 🔍 WhatsApp Number Checker

### NEW FEATURE: Check Which Numbers Are on WhatsApp!

Agar aapke paas numbers ki list hai, to ab aap check kar sakte ho ke kon se numbers WhatsApp par registered hain aur kon se nahi!

### Quick Start:

1. **Add your numbers** to `utils/numbers.js`:

```javascript
const numbers = [
  "03015667134",
  "03015667135",
  "03201234567",
  // ... more numbers
];
```

2. **Open the checker page:**

```
http://localhost:3000/check-numbers.html
```

3. **Click "Check Numbers"** and wait for results!

### What You Get:

✅ **Summary Statistics** - Total, On WhatsApp, Not on WhatsApp  
✅ **Detailed Results** - See each number's status  
✅ **Multiple Views** - All results, only valid, only invalid  
✅ **Beautiful UI** - Modern, responsive interface  
✅ **Progress Tracking** - Real-time progress bar  
✅ **Auto Formatting** - Automatically formats Pakistani numbers

### API Endpoints:

```bash
# Get list of numbers (preview)
GET http://localhost:3000/numbers-list

# Check all numbers
GET http://localhost:3000/check-numbers
```

### Example Response:

```json
{
  "success": true,
  "message": "Number check completed",
  "summary": {
    "total": 26,
    "onWhatsApp": 15,
    "notOnWhatsApp": 11
  },
  "results": {
    "onWhatsApp": [
      {
        "original": "03015667134",
        "formatted": "923015667134",
        "status": "✅ On WhatsApp"
      }
    ],
    "notOnWhatsApp": [...]
  }
}
```

### 📖 Complete Guide:

**[NUMBER_CHECKER_GUIDE.md](./NUMBER_CHECKER_GUIDE.md)** - Complete documentation with examples and troubleshooting

### Features:

- ✅ Bulk number checking
- ✅ **Auto-save to MongoDB** (verified numbers saved automatically)
- ✅ **Database management** (view, export, delete verified numbers)
- ✅ Automatic number formatting (Pakistan +92)
- ✅ Rate limiting protection
- ✅ Beautiful web interface with DB stats
- ✅ Real-time progress tracking
- ✅ Multiple result views
- ✅ Export verified numbers to CSV
- ✅ API access for automation
- ✅ Error handling
- ✅ Duplicate detection (updates existing entries)

### Database Collection:

Verified WhatsApp numbers are saved in MongoDB collection `verifiednumbers`:

```javascript
{
  number: "923015667134",  // Clean number (no @c.us)
  createdAt: Date,         // Auto timestamp
  updatedAt: Date          // Auto timestamp
}
```

**Note:** All numbers in the database are valid WhatsApp numbers by definition.

**✨ Smart Features:**

- Numbers stored **without @c.us** suffix
- `03015667134` and `923015667134` treated as **same number**
- **Duplicates automatically removed** from results (UI shows 7, not 13!)
- Only **verified numbers** stored in DB

### Additional API Endpoints:

```bash
# Get all verified numbers from database
GET http://localhost:3000/verified-numbers

# Get database statistics
GET http://localhost:3000/verified-numbers/stats

# Export verified numbers as CSV
GET http://localhost:3000/verified-numbers/export

# Delete a specific number from database
DELETE http://localhost:3000/verified-numbers/923015667134

# Clear all verified numbers from database
DELETE http://localhost:3000/verified-numbers
```
