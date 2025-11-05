# 📥 CSV Export Guide - Download WhatsApp Contacts

## 🚀 Quick Start

### Method 1: Web Interface (Easiest!) ⭐

1. **Start your server:**
   ```bash
   npm start
   ```

2. **Open in browser:**
   ```
   http://localhost:3000/export.html
   ```

3. **Select filters:**
   - ✅ Saved Contacts Only (Recommended)
   - ✅ Exclude Unknown Names
   - ✅ Validate Phone Numbers

4. **Click "Download CSV File"**
   - File automatically downloads!
   - Filename: `whatsapp_contacts_saved_2025-11-02T10-30-45.csv`

---

### Method 2: Direct URL (Browser)

Simply open these URLs in your browser:

```bash
# All contacts
http://localhost:3000/contacts/export

# Saved contacts only (Recommended!)
http://localhost:3000/contacts/export?savedOnly=true

# All filters combined
http://localhost:3000/contacts/export?savedOnly=true&excludeUnknown=true
```

**File will automatically download!** 📥

---

### Method 3: Command Line (cURL)

```bash
# Download to current directory
curl "http://localhost:3000/contacts/export?savedOnly=true" -o contacts.csv

# Download all contacts
curl "http://localhost:3000/contacts/export" -o all_contacts.csv

# Download with all filters
curl "http://localhost:3000/contacts/export?savedOnly=true&excludeUnknown=true" -o clean_contacts.csv
```

---

## 📊 CSV File Format

### Columns

| Column       | Description                    | Example                  |
| ------------ | ------------------------------ | ------------------------ |
| Name         | Contact name                   | "Ahmed Ali"              |
| Number       | Phone number                   | 923001234567             |
| WhatsApp ID  | Full WhatsApp ID               | 923001234567@c.us        |
| Saved        | Is contact saved? (Yes/No)     | Yes                      |
| Business     | Is business account? (Yes/No)  | No                       |
| Short Name   | Short name if available        | "Ahmed"                  |

### Example CSV Content

```csv
Name,Number,WhatsApp ID,Saved,Business,Short Name
"Ahmed Ali",923001234567,923001234567@c.us,Yes,No,"Ahmed"
"Sara Khan",923007654321,923007654321@c.us,Yes,No,""
"Tech Store",923009876543,923009876543@c.us,Yes,Yes,""
"Unknown",923001111111,923001111111@c.us,No,No,""
```

---

## 🔧 Filtering Options

### Available Filters

| Parameter        | Values      | Default | Description                       |
| ---------------- | ----------- | ------- | --------------------------------- |
| savedOnly        | true/false  | false   | Only saved contacts               |
| excludeUnknown   | true/false  | false   | Exclude "Unknown" names           |
| validateNumber   | true/false  | true    | Validate phone number format      |

### Filter Combinations

#### 1. All Contacts (No Filter)
```bash
http://localhost:3000/contacts/export
```
**Result:** All contacts (867 contacts in your case)

#### 2. Saved Only (Recommended) ⭐
```bash
http://localhost:3000/contacts/export?savedOnly=true
```
**Result:** Only saved contacts (311 in your case)
**Best for:** Avoiding fake/spam contacts

#### 3. Saved + No Unknown (Maximum Clean!)
```bash
http://localhost:3000/contacts/export?savedOnly=true&excludeUnknown=true
```
**Result:** Saved contacts with proper names (~260 in your case)
**Best for:** Clean contact list for bulk messaging

#### 4. Everything + Validation
```bash
http://localhost:3000/contacts/export?validateNumber=true
```
**Result:** All contacts with valid phone numbers (default)

---

## 💻 Programmatic Download

### JavaScript / Node.js

```javascript
const axios = require("axios");
const fs = require("fs");

async function downloadContacts() {
  try {
    const response = await axios.get(
      "http://localhost:3000/contacts/export?savedOnly=true",
      { responseType: "text" }
    );

    fs.writeFileSync("contacts.csv", response.data, "utf-8");
    console.log("✅ CSV file saved: contacts.csv");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

downloadContacts();
```

### Python

```python
import requests

def download_contacts():
    try:
        url = "http://localhost:3000/contacts/export?savedOnly=true"
        response = requests.get(url)
        
        with open("contacts.csv", "w", encoding="utf-8") as f:
            f.write(response.text)
        
        print("✅ CSV file saved: contacts.csv")
    except Exception as e:
        print(f"❌ Error: {e}")

download_contacts()
```

### PHP

```php
<?php
$url = "http://localhost:3000/contacts/export?savedOnly=true";
$csv_data = file_get_contents($url);

file_put_contents("contacts.csv", $csv_data);
echo "✅ CSV file saved: contacts.csv\n";
?>
```

---

## 📱 Opening CSV Files

### Excel (Windows/Mac)
1. Double-click the CSV file
2. Or: Open Excel → File → Open → Select CSV file

### Google Sheets
1. Go to Google Sheets
2. File → Import
3. Upload tab → Select CSV file
4. Click "Import data"

### LibreOffice Calc (Free)
1. Open LibreOffice Calc
2. File → Open → Select CSV file

### Numbers (Mac)
1. Double-click CSV file
2. Or: Open Numbers → File → Open

---

## 🎯 Use Cases

### 1. Contact Backup
```bash
# Download all contacts for backup
curl "http://localhost:3000/contacts/export" -o backup_$(date +%Y%m%d).csv
```

### 2. Clean List for Marketing
```bash
# Download only saved, named contacts
curl "http://localhost:3000/contacts/export?savedOnly=true&excludeUnknown=true" -o marketing_list.csv
```

### 3. Import to Another App
1. Download CSV
2. Open in Excel/Sheets
3. Format as needed
4. Import to your app (CRM, Email marketing, etc.)

### 4. Data Analysis
```bash
# Download for analysis
curl "http://localhost:3000/contacts/export?savedOnly=true" -o contacts.csv
# Analyze in Excel, Python pandas, R, etc.
```

---

## ⚠️ Important Notes

### ✅ DO:
- Use `savedOnly=true` for production
- Keep `validateNumber=true` enabled
- Backup regularly
- Check file encoding (UTF-8)

### ❌ DON'T:
- Don't share CSV files publicly (contains phone numbers!)
- Don't disable number validation unless needed
- Don't rely on unsaved contacts for important tasks

---

## 🔒 Security & Privacy

- **Local Only:** CSV files are generated on-demand (not stored on server)
- **Private Data:** CSV contains phone numbers - keep it secure!
- **HTTPS:** Use HTTPS in production
- **Access Control:** Add authentication if needed

---

## 🐛 Troubleshooting

### Problem: Download not starting
**Solution:** Check if WhatsApp client is ready
```bash
curl http://localhost:3000/info
```

### Problem: Empty CSV file
**Solution:** Filters might be too restrictive
- Try removing filters
- Check if contacts exist

### Problem: Special characters broken
**Solution:** CSV uses UTF-8 encoding
- Open with encoding set to UTF-8
- Most modern apps handle this automatically

### Problem: "Client not ready" error
**Solution:** Scan QR code first
1. Go to `http://localhost:3000/qr`
2. Scan QR code
3. Wait for "ready" status
4. Try export again

---

## 📊 Your Current Stats

Based on your data:
- **Total Contacts:** 867
- **Saved Contacts:** 311 ⭐ (Recommended)
- **Unsaved Contacts:** 556 (May include fake/spam)
- **Unknown Names:** 294

### Recommendations:
```bash
# Best option for you:
http://localhost:3000/contacts/export?savedOnly=true

# This will give you 311 clean contacts!
```

---

## 🚀 Quick Commands Summary

```bash
# Web interface (easiest)
http://localhost:3000/export.html

# Direct download - saved only
http://localhost:3000/contacts/export?savedOnly=true

# cURL - saved only
curl "http://localhost:3000/contacts/export?savedOnly=true" -o contacts.csv

# cURL - maximum clean
curl "http://localhost:3000/contacts/export?savedOnly=true&excludeUnknown=true" -o clean_contacts.csv
```

---

## 📚 Related Documentation

- **[CONTACTS_API.md](./CONTACTS_API.md)** - Complete API documentation
- **[FILTERING_GUIDE.md](./FILTERING_GUIDE.md)** - Filtering options guide
- **[README.md](./README.md)** - Main documentation

---

## 🎉 Happy Exporting!

Your contacts are now just one click away! 💾

Questions? Check the main documentation or create an issue.

