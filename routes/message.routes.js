const express = require("express");
const router = express.Router();
const { sendWhatsAppMessage } = require("../controllers/message.controller");

router.post("/send", sendWhatsAppMessage);
router.post("/api/message", sendWhatsAppMessage); // Alias for bulk message UI

module.exports = router;
