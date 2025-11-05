# 📇 WhatsApp Contacts API Documentation

## Overview

आप अब अपने WhatsApp account से सभी contacts को fetch कर सकते हैं जब आप QR code scan कर लेते हैं।

## ⚠️ Important Note

- पहले QR code scan करना **ज़रूरी** है
- Client ready होने के बाद ही contacts fetch होंगे
- केवल real contacts ही fetch होंगे (groups और broadcast lists नहीं)

---

## 🔍 Filtering Fake Contacts

Fake/spam contacts ko filter karne ke liye **query parameters** use kar sakte ho:

- **`?savedOnly=true`** ⭐ - Sirf saved contacts (recommended for production)
- **`?excludeUnknown=true`** - "Unknown" name wale contacts filter ho jayenge
- **`?validateNumber=true`** - Invalid phone numbers filter (default enabled)

📖 **Complete Filtering Guide:** [FILTERING_GUIDE.md](./FILTERING_GUIDE.md)

---

## 🔥 API Endpoints

### 1. Get All Contacts (JSON Format)

**Endpoint:** `GET /contacts`

**Description:** WhatsApp account से सभी contacts की list fetch करता है।

#### Request

```bash
# Basic request (all contacts)
GET http://localhost:3000/contacts

# Recommended: Sirf saved contacts (NO fake contacts)
GET http://localhost:3000/contacts?savedOnly=true

# Advanced: Multiple filters
GET http://localhost:3000/contacts?savedOnly=true&excludeUnknown=true
```

```bash
# Using curl
curl http://localhost:3000/contacts

# Saved contacts only (recommended)
curl "http://localhost:3000/contacts?savedOnly=true"
```

#### Query Parameters (Optional - For Filtering)

| Parameter        | Type    | Default | Description                                     |
| ---------------- | ------- | ------- | ----------------------------------------------- |
| `savedOnly`      | boolean | false   | Sirf saved contacts (fake filter ho jayenge) ⭐ |
| `excludeUnknown` | boolean | false   | "Unknown" name wale contacts filter karein      |
| `validateNumber` | boolean | true    | Phone number validation (7-15 digits)           |

**💡 Tip:** Fake contacts se bachne ke liye `?savedOnly=true` use karein!

#### Response (Success - 200)

```json
{
  "success": true,
  "message": "Contacts retrieved successfully",
  "total": 150,
  "filters": {
    "savedOnly": true,
    "excludeUnknown": false,
    "validateNumber": true
  },
  "contacts": [
    {
      "name": "Ahmed Ali",
      "number": "923001234567",
      "id": "923001234567@c.us",
      "isMyContact": true,
      "isBusiness": false,
      "shortName": "Ahmed"
    },
    {
      "name": "Sara Khan",
      "number": "923007654321",
      "id": "923007654321@c.us",
      "isMyContact": true,
      "isBusiness": false,
      "shortName": null
    },
    {
      "name": "Tech Store",
      "number": "923009876543",
      "id": "923009876543@c.us",
      "isMyContact": true,
      "isBusiness": true,
      "shortName": null
    }
  ]
}
```

#### Response (Client Not Ready - 503)

```json
{
  "success": false,
  "error": "WhatsApp client not ready. Please scan QR code first.",
  "message": "Client not connected"
}
```

#### Response (Error - 500)

```json
{
  "success": false,
  "error": "Failed to fetch contacts",
  "message": "Error details here"
}
```

#### Contact Object Fields

| Field         | Type    | Description                                   |
| ------------- | ------- | --------------------------------------------- |
| `name`        | string  | Contact का naam (या "Unknown" agar naam nahi) |
| `number`      | string  | WhatsApp number (without @c.us)               |
| `id`          | string  | Full WhatsApp ID (with @c.us)                 |
| `isMyContact` | boolean | Kya ye aapke saved contacts mein hai          |
| `isBusiness`  | boolean | Kya ye business account hai                   |
| `shortName`   | string  | Short name (agar available ho)                |

---

### 2. Export Contacts as CSV (Download File)

**Endpoint:** `GET /contacts/export`

**Description:** Contacts ko CSV file format mein download karta hai. Browser mein open karein aur file automatically download ho jayegi!

#### Request

```bash
# All contacts
GET http://localhost:3000/contacts/export

# Saved contacts only (Recommended!)
GET http://localhost:3000/contacts/export?savedOnly=true

# With all filters
GET http://localhost:3000/contacts/export?savedOnly=true&excludeUnknown=true
```

```bash
# Using curl to download
curl "http://localhost:3000/contacts/export?savedOnly=true" -o contacts.csv

# Or just open in browser
# Browser will automatically download the file!
```

#### Query Parameters

Same as `/contacts` endpoint:

- `savedOnly` - Only saved contacts
- `excludeUnknown` - Exclude "Unknown" names
- `validateNumber` - Validate phone numbers (default: true)

#### Response (CSV File Download)

**File Format:** CSV (Comma Separated Values)

**Filename Example:** `whatsapp_contacts_saved_2025-11-02T10-30-45.csv`

**CSV Content:**

```csv
Name,Number,WhatsApp ID,Saved,Business,Short Name
"Ahmed Ali",923001234567,923001234567@c.us,Yes,No,"Ahmed"
"Sara Khan",923007654321,923007654321@c.us,Yes,No,""
"Tech Store",923009876543,923009876543@c.us,Yes,Yes,""
```

**CSV Columns:**

- `Name` - Contact name
- `Number` - Phone number
- `WhatsApp ID` - Full WhatsApp ID
- `Saved` - Yes/No (Is contact saved)
- `Business` - Yes/No (Is business account)
- `Short Name` - Short name (if available)

#### How to Use

**Option 1: Browser** (Easiest!)

1. Browser mein URL open karein
2. File automatically download ho jayegi
3. Excel ya Google Sheets mein open karein

**Option 2: Programmatically Download**

```javascript
const axios = require("axios");
const fs = require("fs");

async function downloadContacts() {
  const response = await axios.get(
    "http://localhost:3000/contacts/export?savedOnly=true",
    { responseType: "text" }
  );

  fs.writeFileSync("my_contacts.csv", response.data);
  console.log("✅ CSV file saved!");
}
```

**Option 3: Python**

```python
import requests

url = "http://localhost:3000/contacts/export?savedOnly=true"
response = requests.get(url)

with open("contacts.csv", "w", encoding="utf-8") as f:
    f.write(response.text)

print("✅ CSV file saved!")
```

---

### 3. Get Contact Statistics

**Endpoint:** `GET /contacts/stats`

**Description:** Contacts की statistics और summary provide करता है।

#### Request

```bash
# Basic stats
GET http://localhost:3000/contacts/stats

# Stats with filters
GET http://localhost:3000/contacts/stats?savedOnly=true
```

```bash
# Using curl
curl http://localhost:3000/contacts/stats

# With filters
curl "http://localhost:3000/contacts/stats?savedOnly=true"
```

**Note:** Stats endpoint bhi same filtering parameters support karta hai!

#### Response (Success - 200)

```json
{
  "success": true,
  "message": "Contact statistics retrieved successfully",
  "filters": {
    "savedOnly": false,
    "excludeUnknown": false,
    "validateNumber": true
  },
  "stats": {
    "total": 150,
    "saved": 120,
    "unsaved": 30,
    "business": 25,
    "regular": 125,
    "unknown": 5
  }
}
```

#### Statistics Fields

| Field      | Description                              |
| ---------- | ---------------------------------------- |
| `total`    | Total contacts ki taadad                 |
| `saved`    | Saved contacts (jo aapke phone mein hai) |
| `unsaved`  | Unsaved contacts                         |
| `business` | Business accounts ki taadad              |
| `regular`  | Regular personal accounts                |
| `unknown`  | "Unknown" name wale contacts             |

---

## 📋 Usage Examples

### Example 1: Node.js / JavaScript

```javascript
// Get all contacts
async function getAllContacts() {
  try {
    const response = await fetch("http://localhost:3000/contacts");
    const data = await response.json();

    if (data.success) {
      console.log(`Total Contacts: ${data.total}`);
      data.contacts.forEach((contact) => {
        console.log(`${contact.name}: ${contact.number}`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Get contact stats
async function getContactStats() {
  try {
    const response = await fetch("http://localhost:3000/contacts/stats");
    const data = await response.json();

    if (data.success) {
      console.log("Contact Statistics:");
      console.log(`Total: ${data.stats.total}`);
      console.log(`Saved: ${data.stats.saved}`);
      console.log(`Business: ${data.stats.business}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
```

### Example 2: Python

```python
import requests

# Get all contacts
def get_all_contacts():
    response = requests.get('http://localhost:3000/contacts')
    data = response.json()

    if data['success']:
        print(f"Total Contacts: {data['total']}")
        for contact in data['contacts']:
            print(f"{contact['name']}: {contact['number']}")

# Get contact stats
def get_contact_stats():
    response = requests.get('http://localhost:3000/contacts/stats')
    data = response.json()

    if data['success']:
        stats = data['stats']
        print(f"Total: {stats['total']}")
        print(f"Saved: {stats['saved']}")
        print(f"Business: {stats['business']}")
```

### Example 3: n8n Workflow

1. **HTTP Request Node** (GET)

   - Method: GET
   - URL: `http://localhost:3000/contacts`

2. **Function Node** (Process Contacts)

```javascript
// Process each contact
const contacts = $json.contacts;

return contacts.map((contact) => ({
  name: contact.name,
  number: contact.number,
  isBusiness: contact.isBusiness,
}));
```

3. **Use contacts** for your automation!

---

## 🔄 Complete Workflow

### Step 1: Start Server

```bash
npm start
```

### Step 2: Scan QR Code

Visit: `http://localhost:3000/qr`

### Step 3: Wait for "Ready" Status

Check: `http://localhost:3000/info`

### Step 4: Fetch Contacts

```bash
curl http://localhost:3000/contacts
```

---

## 💡 Use Cases

1. **Contact Backup**

   - Apne WhatsApp contacts ka backup le sakte ho
   - Database mein save kar sakte ho

2. **Bulk Messaging**

   - Sab contacts ko list kar ke messages bhej sakte ho
   - Filter kar ke specific contacts ko target kar sakte ho

3. **Contact Management**

   - Business vs Personal contacts ko separate kar sakte ho
   - Saved vs Unsaved contacts ko identify kar sakte ho

4. **Analytics**

   - Contact statistics track kar sakte ho
   - Business accounts ko identify kar sakte ho

5. **n8n Automation**
   - Contacts ko automatically process kar sakte ho
   - Webhooks ke saath integrate kar sakte ho

---

## ⚡ Features

✅ Real-time contact fetching  
✅ Automatic filtering (no groups/broadcasts)  
✅ Only standard WhatsApp numbers (@c.us format)  
✅ LID format (@lid) automatically filtered  
✅ Alphabetically sorted by name  
✅ Business account detection  
✅ Saved contact identification  
✅ Statistics and analytics  
✅ Clean JSON response  
✅ Error handling  
✅ No duplicate contacts

---

## 📝 Technical Notes

### Why Only @c.us Format?

WhatsApp uses two types of identifiers:

- **@c.us** - Standard WhatsApp number format (e.g., `923001234567@c.us`)
- **@lid** - New LID (Linked ID) format (e.g., `152986936422404@lid`)

**Problem:** Ek hi contact ke liye dono formats mil jaate hain, jo duplicate entries create karta hai.

**Solution:** Hum sirf `@c.us` format ko rakhte hain kyunki:

- ✅ Yeh standard WhatsApp number format hai
- ✅ Messages bhejne ke liye yeh format chahiye
- ✅ Duplicate contacts se bach jaate hain
- ✅ Real phone number milta hai

### Example:

**Before filtering:**

```json
[
  { "id": "152986936422404@lid", "number": "152986936422404" },
  { "id": "923404308174@c.us", "number": "923404308174" }
]
```

**After filtering (only @c.us):**

```json
[{ "id": "923404308174@c.us", "number": "923404308174" }]
```

---

## 🔐 Privacy & Security

- ⚠️ **Important:** Contacts sirf tab fetch hote hain jab aapka WhatsApp connected ho
- Contacts MongoDB mein store **NAHI** hote (only session data store hota hai)
- API responses mein sensitive data minimize kiya gaya hai
- Local network pe use karna recommended hai

---

## 🚀 Next Steps

Ab aap:

1. ✅ Contacts fetch kar sakte ho
2. ✅ Statistics dekh sakte ho
3. ✅ n8n ke saath integrate kar sakte ho
4. ✅ Bulk messaging kar sakte ho
5. ✅ Custom automation bana sakte ho

Happy Coding! 🎉
