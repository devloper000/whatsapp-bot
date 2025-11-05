# 🔍 WhatsApp Contacts Filtering Guide

## Overview

Fake aur unwanted contacts ko filter karne ke liye **3 powerful filtering options** available hain!

---

## 📋 Filtering Options

### 1. **savedOnly** - Sirf Saved Contacts

Sirf woh contacts jo aapke phone mein saved hain.

**Use Case:** Fake/spam contacts se bachne ka **sabse best tareeqa**

### 2. **excludeUnknown** - "Unknown" Names Ko Hatao

Jo contacts ka naam "Unknown" hai, unhe filter kar do.

**Use Case:** Jab aap sirf named contacts chahte ho

### 3. **validateNumber** - Phone Number Validation

Invalid length wale numbers ko filter karo (7-15 digits standard).

**Use Case:** Fake/invalid numbers ko automatically hatana

---

## 🚀 Usage Examples

### Example 1: Sirf Saved Contacts (Recommended)

```bash
# Sirf saved contacts - FAKE contacts nahi aayenge
GET http://localhost:3000/contacts?savedOnly=true
```

```bash
# Using curl
curl "http://localhost:3000/contacts?savedOnly=true"
```

**Response:**

```json
{
  "success": true,
  "total": 80,
  "filters": {
    "savedOnly": true,
    "excludeUnknown": false,
    "validateNumber": true
  },
  "contacts": [
    {
      "name": "Ahmed Ali",
      "number": "923001234567",
      "isMyContact": true
    }
  ]
}
```

---

### Example 2: Exclude Unknown Names

```bash
# "Unknown" name wale contacts nahi chahiye
GET http://localhost:3000/contacts?excludeUnknown=true
```

```bash
# Using curl
curl "http://localhost:3000/contacts?excludeUnknown=true"
```

---

### Example 3: Combine Multiple Filters (Best!)

```bash
# Saved + No Unknown + Validated numbers
GET http://localhost:3000/contacts?savedOnly=true&excludeUnknown=true
```

```bash
# Using curl
curl "http://localhost:3000/contacts?savedOnly=true&excludeUnknown=true"
```

**Response:**

```json
{
  "success": true,
  "total": 75,
  "filters": {
    "savedOnly": true,
    "excludeUnknown": true,
    "validateNumber": true
  },
  "contacts": [...]
}
```

---

### Example 4: All Contacts (No Filters - Default)

```bash
# All contacts including unsaved
GET http://localhost:3000/contacts
```

---

### Example 5: Statistics With Filters

```bash
# Stats with filters
GET http://localhost:3000/contacts/stats?savedOnly=true&excludeUnknown=true
```

**Response:**

```json
{
  "success": true,
  "filters": {
    "savedOnly": true,
    "excludeUnknown": true,
    "validateNumber": true
  },
  "stats": {
    "total": 75,
    "saved": 75,
    "unsaved": 0,
    "business": 10,
    "regular": 65,
    "unknown": 0
  }
}
```

---

## 📊 Filter Comparison

| Filter           | Default | Purpose                       | Best For                  |
| ---------------- | ------- | ----------------------------- | ------------------------- |
| `savedOnly`      | false   | Sirf saved contacts           | Fake contacts se bachna   |
| `excludeUnknown` | false   | "Unknown" naam ko filter karo | Named contacts only       |
| `validateNumber` | true    | Phone number validation       | Invalid numbers se bachna |

---

## 💡 Recommended Configurations

### 1. **Most Accurate (Recommended)**

```bash
?savedOnly=true&excludeUnknown=true
```

**Result:** Sirf saved contacts with proper names

### 2. **All Valid Contacts**

```bash
?validateNumber=true
```

**Result:** Valid phone numbers only (default behavior)

### 3. **Named Contacts Only**

```bash
?excludeUnknown=true
```

**Result:** All contacts except "Unknown" names

### 4. **Everything**

```bash
# No query parameters
```

**Result:** All contacts (filtered by @c.us only)

---

## 🔧 Code Examples

### JavaScript / Node.js

```javascript
const axios = require("axios");

// Example 1: Saved contacts only
async function getSavedContacts() {
  const response = await axios.get("http://localhost:3000/contacts", {
    params: {
      savedOnly: true,
    },
  });
  return response.data.contacts;
}

// Example 2: All filters combined
async function getCleanContacts() {
  const response = await axios.get("http://localhost:3000/contacts", {
    params: {
      savedOnly: true,
      excludeUnknown: true,
      validateNumber: true,
    },
  });
  return response.data.contacts;
}

// Example 3: Stats with filters
async function getFilteredStats() {
  const response = await axios.get("http://localhost:3000/contacts/stats", {
    params: {
      savedOnly: true,
    },
  });
  return response.data.stats;
}
```

### Python

```python
import requests

# Example 1: Saved contacts only
def get_saved_contacts():
    response = requests.get(
        'http://localhost:3000/contacts',
        params={'savedOnly': 'true'}
    )
    return response.json()['contacts']

# Example 2: All filters combined
def get_clean_contacts():
    response = requests.get(
        'http://localhost:3000/contacts',
        params={
            'savedOnly': 'true',
            'excludeUnknown': 'true',
            'validateNumber': 'true'
        }
    )
    return response.json()['contacts']
```

### cURL Commands

```bash
# Saved only
curl "http://localhost:3000/contacts?savedOnly=true"

# Exclude unknown
curl "http://localhost:3000/contacts?excludeUnknown=true"

# Combined filters
curl "http://localhost:3000/contacts?savedOnly=true&excludeUnknown=true"

# Stats with filters
curl "http://localhost:3000/contacts/stats?savedOnly=true"
```

---

## 🧪 Testing

Update test script to try different filters:

```javascript
// test-contacts.js
async function testFilteredContacts() {
  console.log("\n🔍 Testing Filtered Contacts");

  // Test 1: All contacts
  let response = await axios.get("http://localhost:3000/contacts");
  console.log(`All Contacts: ${response.data.total}`);

  // Test 2: Saved only
  response = await axios.get("http://localhost:3000/contacts?savedOnly=true");
  console.log(`Saved Only: ${response.data.total}`);

  // Test 3: Exclude unknown
  response = await axios.get(
    "http://localhost:3000/contacts?excludeUnknown=true"
  );
  console.log(`Without Unknown: ${response.data.total}`);

  // Test 4: Combined
  response = await axios.get(
    "http://localhost:3000/contacts?savedOnly=true&excludeUnknown=true"
  );
  console.log(`Saved + No Unknown: ${response.data.total}`);
}
```

---

## 📌 Quick Reference

### Default Behavior (No Parameters)

```bash
GET /contacts
```

- ✅ Valid phone numbers (7-15 digits)
- ✅ Only @c.us format
- ❌ No LID (@lid) entries
- ❌ No groups/broadcasts

### With savedOnly=true

```bash
GET /contacts?savedOnly=true
```

- ✅ All default filters +
- ✅ Only saved contacts (isMyContact: true)
- ❌ No unsaved/fake contacts

### With excludeUnknown=true

```bash
GET /contacts?excludeUnknown=true
```

- ✅ All default filters +
- ✅ Only named contacts
- ❌ No "Unknown" names

### All Filters Combined

```bash
GET /contacts?savedOnly=true&excludeUnknown=true
```

- ✅ Saved contacts only
- ✅ Named contacts only
- ✅ Valid numbers only
- ✅ **Cleanest result!**

---

## ❓ FAQ

### Q: Sabse best filter kaun sa hai?

**A:** `savedOnly=true` - Yeh fake contacts ko filter kar deta hai.

### Q: Multiple filters ek saath use kar sakte hain?

**A:** Haan! Query parameters combine kar sakte ho:

```bash
?savedOnly=true&excludeUnknown=true
```

### Q: Default behavior kya hai?

**A:** By default sirf `validateNumber=true` hai. Baaki sab filters off hain.

### Q: Kya filters stats endpoint pe bhi kaam karte hain?

**A:** Haan! Stats endpoint pe bhi same filters use kar sakte ho.

### Q: Invalid numbers ka matlab kya hai?

**A:** Phone numbers jo 7 se kam ya 15 se zyada digits ke hain (E.164 standard).

---

## 🎯 Best Practices

1. ✅ **Production use:** `savedOnly=true` use karein
2. ✅ **Bulk messaging:** `savedOnly=true&excludeUnknown=true`
3. ✅ **Analytics:** No filters for complete data
4. ✅ **Testing:** Different filters ko test karein

---

## 🚀 Next Steps

1. Apne use case ke hisaab se filter choose karein
2. Test karein different combinations
3. n8n workflows mein integrate karein
4. Production mein deploy karein

Happy Filtering! 🎉
