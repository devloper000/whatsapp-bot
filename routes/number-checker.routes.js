const express = require("express");
const router = express.Router();
const {
  checkNumbers,
  getNumbersList,
  getVerifiedNumbers,
  getVerifiedStats,
  deleteVerifiedNumber,
  clearAllVerifiedNumbers,
  exportVerifiedNumbersCSV,
  checkSingleNumber,
  getCountriesList,
} = require("../controllers/number-checker.controller");

// Check all numbers from utils/numbers.js (also saves to DB)
router.get("/check-numbers", checkNumbers);

// Check a single Pakistani number
router.get("/check-single-number", checkSingleNumber);
router.post("/check-single-number", checkSingleNumber);

// Get list of all countries with calling codes
router.get("/countries", getCountriesList);

// Get list of numbers from utils/numbers.js (preview)
router.get("/numbers-list", getNumbersList);

// Get all verified numbers from database
router.get("/verified-numbers", getVerifiedNumbers);

// Get verified numbers statistics from database
router.get("/verified-numbers/stats", getVerifiedStats);

// Export verified numbers as CSV
router.get("/verified-numbers/export", exportVerifiedNumbersCSV);

// Delete a specific verified number from database
router.delete("/verified-numbers/:number", deleteVerifiedNumber);

// Clear all verified numbers from database
router.delete("/verified-numbers", clearAllVerifiedNumbers);

module.exports = router;
