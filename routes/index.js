const express = require("express");
const router = express.Router();
const qrRoutes = require("./qr.routes");
const messageRoutes = require("./message.routes");
const statusRoutes = require("./status.routes");
const contactRoutes = require("./contact.routes");
const numberCheckerRoutes = require("./number-checker.routes");

router.use(qrRoutes);
router.use(messageRoutes);
router.use(statusRoutes);
router.use(contactRoutes);
router.use(numberCheckerRoutes);

module.exports = router;
