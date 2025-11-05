# 📱 WhatsApp Number Checker Guide

## Overview

The WhatsApp Number Checker is a powerful feature that allows you to check which numbers from your `utils/numbers.js` file are registered on WhatsApp and which are not.

## Features

✅ **Bulk Number Checking** - Check multiple numbers at once  
✅ **Beautiful UI** - Modern, responsive web interface  
✅ **Detailed Results** - See which numbers are on WhatsApp and which aren't  
✅ **Progress Tracking** - Real-time progress bar during checking  
✅ **Smart Formatting** - Automatically formats Pakistani numbers (removes leading 0, adds country code)  
✅ **Rate Limiting** - Built-in delays to avoid WhatsApp rate limits  
✅ **Multiple Views** - View all results, only WhatsApp numbers, or only non-WhatsApp numbers

## How It Works

1. The tool reads all numbers from `utils/numbers.js`
2. For each number:
   - Formats it properly (e.g., `03015667134` → `923015667134@c.us`)
   - Checks if it's registered on WhatsApp using the official WhatsApp Web API
   - Records the result
3. Shows you a detailed breakdown with statistics

## Usage

### Method 1: Web Interface (Recommended)

1. **Start your server:**

   ```bash
   npm start
   ```

2. **Open the checker page:**

   ```
   http://localhost:3000/check-numbers.html
   ```

3. **Make sure WhatsApp is connected:**

   - If not connected, scan the QR code first at `http://localhost:3000/qr`

4. **Click "Preview Numbers"** to see all numbers that will be checked

5. **Click "Check Numbers"** to start the checking process

6. **Wait for results:**

   - Each number takes ~0.5 seconds to check
   - Progress bar shows current progress
   - For 26 numbers, it takes approximately 13 seconds

7. **View results in different tabs:**
   - **All Results** - See every number and its status
   - **On WhatsApp** - Only numbers that are registered
   - **Not on WhatsApp** - Only numbers that aren't registered

### Method 2: API Endpoint

You can also use the API directly:

#### Get Numbers List (Preview)

```bash
GET http://localhost:3000/numbers-list
```

**Response:**

```json
{
  "success": true,
  "message": "Numbers list retrieved",
  "total": 26,
  "numbers": ["03015667134", "03015667135", "..."]
}
```

#### Check All Numbers

```bash
GET http://localhost:3000/check-numbers
```

**Response:**

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
    "all": [...],
    "onWhatsApp": [...],
    "notOnWhatsApp": [...]
  }
}
```

## Number Format

The checker automatically handles Pakistani phone numbers:

| Input Format   | Formatted For WhatsApp | Final WhatsApp ID   |
| -------------- | ---------------------- | ------------------- |
| `03015667134`  | `923015667134`         | `923015667134@c.us` |
| `3015667134`   | `923015667134`         | `923015667134@c.us` |
| `923015667134` | `923015667134`         | `923015667134@c.us` |

### For Other Countries

If you need to check numbers from other countries, modify the controller:

```javascript
// In controllers/number-checker.controller.js

// For India (+91)
if (formattedNumber.startsWith("0")) {
  formattedNumber = "91" + formattedNumber.substring(1);
}

// For USA (+1)
if (formattedNumber.length === 10) {
  formattedNumber = "1" + formattedNumber;
}
```

## How to Add/Update Numbers

1. **Open** `utils/numbers.js`

2. **Add or modify numbers** in the array:

   ```javascript
   const numbers = [
     "03015667134",
     "03015667135",
     "03201234567", // Add new numbers here
     // ... more numbers
   ];
   ```

3. **Save the file**

4. **Restart your server** (if running)

5. **Check numbers again** using the web interface

## Understanding the Results

### Web Interface Results

Each result shows:

- **Original Number** - The number as it appears in `numbers.js`
- **Formatted Number** - The number with country code
- **Status** - Whether it's on WhatsApp or not

### API Response Structure

```json
{
  "original": "03015667134",
  "formatted": "923015667134",
  "whatsappNumber": "923015667134@c.us",
  "onWhatsApp": true,
  "status": "✅ On WhatsApp"
}
```

## Performance & Rate Limiting

- **Checking Speed:** ~0.5 seconds per number
- **Built-in Delay:** 500ms between checks to avoid rate limits
- **Estimated Time:**
  - 26 numbers ≈ 13 seconds
  - 100 numbers ≈ 50 seconds
  - 200 numbers ≈ 1 minute 40 seconds

**⚠️ Important:** Do not reduce the delay below 500ms to avoid getting temporarily blocked by WhatsApp.

## Error Handling

The checker gracefully handles:

- ✅ WhatsApp client not ready
- ✅ Invalid phone numbers
- ✅ Network errors
- ✅ Rate limiting
- ✅ Individual number check failures

If a number fails to check, it will be marked as "⚠️ Error checking" with error details.

## Common Issues & Solutions

### 1. "WhatsApp client not ready" Error

**Problem:** WhatsApp Web is not connected

**Solution:**

1. Go to `http://localhost:3000/qr`
2. Scan the QR code with your WhatsApp mobile app
3. Wait for "WhatsApp Web.js Client is Ready!" message
4. Try checking numbers again

### 2. All Numbers Showing as "Not on WhatsApp"

**Problem:** Numbers might be incorrectly formatted

**Solutions:**

- Check if country code is correct in the controller
- Verify numbers in `utils/numbers.js` are valid
- Ensure WhatsApp is properly connected

### 3. Checking is Very Slow

**Problem:** Large number of contacts to check

**Solutions:**

- This is normal - checking takes ~0.5 seconds per number
- Consider splitting into smaller batches
- Be patient - the progress bar shows real-time progress

### 4. Server Crashes During Check

**Problem:** Too many requests or memory issue

**Solutions:**

- Reduce the number of numbers in `numbers.js`
- Increase the delay between checks
- Check server logs for specific errors

## Integration Examples

### Using with n8n Workflow

You can integrate the number checker with your n8n workflows:

1. **HTTP Request Node** → `GET http://localhost:3000/check-numbers`
2. **Filter Results** → Use n8n's filter node to separate valid/invalid numbers
3. **Send Messages** → Only send to numbers that are on WhatsApp

### Using with Your Own Code

```javascript
const axios = require("axios");

async function checkMyNumbers() {
  try {
    const response = await axios.get("http://localhost:3000/check-numbers");
    const data = response.data;

    console.log(`Total: ${data.summary.total}`);
    console.log(`On WhatsApp: ${data.summary.onWhatsApp}`);
    console.log(`Not on WhatsApp: ${data.summary.notOnWhatsApp}`);

    // Get only valid WhatsApp numbers
    const validNumbers = data.results.onWhatsApp.map((r) => r.formatted);
    console.log("Valid numbers:", validNumbers);

    return validNumbers;
  } catch (error) {
    console.error("Error:", error.message);
  }
}
```

## Best Practices

1. **✅ Check Before Sending:** Always check numbers before starting a broadcast campaign
2. **✅ Regular Updates:** Check numbers periodically as people change numbers
3. **✅ Respect Rate Limits:** Don't modify the delay - 500ms is safe
4. **✅ Keep Numbers Updated:** Remove invalid numbers from your list
5. **❌ Don't Spam:** Only send messages to people who opted in

## Technical Details

### Files Structure

```
├── controllers/
│   └── number-checker.controller.js    # Business logic
├── routes/
│   └── number-checker.routes.js        # API routes
├── utils/
│   └── numbers.js                      # Your numbers list
├── public/
│   └── check-numbers.html              # Web interface
└── NUMBER_CHECKER_GUIDE.md             # This guide
```

### How Numbers are Checked

The checker uses WhatsApp Web.js's `getNumberId()` method:

```javascript
const numberId = await whatsappClient.getNumberId(phoneNumber);
return numberId !== null;
```

This method:

- ✅ Does NOT send any messages
- ✅ Does NOT notify the number's owner
- ✅ Is safe to use for bulk checking
- ✅ Works with official WhatsApp Web API

## API Reference

### GET /numbers-list

Get list of all numbers from `utils/numbers.js`

**Response:**

```json
{
  "success": true,
  "message": "Numbers list retrieved",
  "total": 26,
  "numbers": ["03015667134", "..."]
}
```

### GET /check-numbers

Check all numbers and return detailed results

**Response:**

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
    "all": [
      {
        "original": "03015667134",
        "formatted": "923015667134",
        "whatsappNumber": "923015667134@c.us",
        "onWhatsApp": true,
        "status": "✅ On WhatsApp"
      }
    ],
    "onWhatsApp": [...],
    "notOnWhatsApp": [...]
  }
}
```

## Support

If you encounter any issues:

1. Check server logs for error messages
2. Ensure WhatsApp is connected (`/qr` endpoint)
3. Verify MongoDB connection
4. Check that numbers in `utils/numbers.js` are valid
5. Ensure you haven't been rate-limited by WhatsApp

## Future Enhancements

Potential features to add:

- [ ] Export results to CSV
- [ ] Schedule automatic checks
- [ ] Email notifications for results
- [ ] Batch number upload via CSV
- [ ] Historical tracking of number status changes
- [ ] API authentication

---

**Made with ❤️ for WhatsApp automation**
