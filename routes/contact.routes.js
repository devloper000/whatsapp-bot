const express = require("express");
const router = express.Router();
const {
  getContacts,
  getContactStats,
  exportContactsCSV,
} = require("../controllers/contact.controller");

// Get all contacts (JSON)
router.get("/contacts", getContacts);

// Get contact statistics
router.get("/contacts/stats", getContactStats);

// Export contacts as CSV (Download)
router.get("/contacts/export", exportContactsCSV);

module.exports = router;
