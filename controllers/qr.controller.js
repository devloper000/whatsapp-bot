const path = require("path");
const { getCurrentQR } = require("../services/qr.service");
const { isReady } = require("../services/whatsapp.service");
const { addQRClient, removeQRClient } = require("../services/qr.service");

/**
 * Get QR code page HTML
 */
const getQRPage = (req, res) => {
  res.sendFile(path.join(__dirname, "../public/qr.html"));
};

/**
 * SSE endpoint for real-time QR updates
 */
const getQRStream = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Add client to the list
  addQRClient(res);

  // Send initial status
  const { qrImage } = getCurrentQR();
  if (isReady()) {
    res.write(`data: ${JSON.stringify({ status: "ready", qr: null })}\n\n`);
  } else if (qrImage) {
    res.write(
      `data: ${JSON.stringify({ status: "qr_ready", qr: qrImage })}\n\n`
    );
  } else {
    res.write(
      `data: ${JSON.stringify({ status: "checking_session", qr: null })}\n\n`
    );
  }

  // Remove client on disconnect
  req.on("close", () => {
    removeQRClient(res);
  });
};

module.exports = {
  getQRPage,
  getQRStream,
};
