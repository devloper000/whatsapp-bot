const { isReady, getAllContacts } = require("../services/whatsapp.service");

/**
 * Get all WhatsApp contacts with optional filtering
 * Query Parameters:
 *  - savedOnly: true/false (default: false) - Only saved contacts
 *  - excludeUnknown: true/false (default: false) - Exclude "Unknown" names
 *  - validateNumber: true/false (default: true) - Validate phone numbers
 */
const getContacts = async (req, res) => {
  try {
    // Check if client is ready
    if (!isReady()) {
      return res.status(503).json({
        success: false,
        error: "WhatsApp client not ready. Please scan QR code first.",
        message: "Client not connected",
      });
    }

    // Parse query parameters
    const savedOnly = req.query.savedOnly === "true";
    const excludeUnknown = req.query.excludeUnknown === "true";
    const validateNumber = req.query.validateNumber !== "false"; // Default true

    // Get all contacts with filters
    const contacts = await getAllContacts({
      savedOnly,
      excludeUnknown,
      validateNumber,
    });

    console.log(`✅ Retrieved ${contacts.length} contacts`);

    res.status(200).json({
      success: true,
      message: "Contacts retrieved successfully",
      total: contacts.length,
      filters: {
        savedOnly,
        excludeUnknown,
        validateNumber,
      },
      contacts: contacts,
    });
  } catch (err) {
    console.error("❌ Error fetching contacts:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch contacts",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Get contact statistics with optional filtering
 * Query Parameters:
 *  - savedOnly: true/false (default: false) - Only saved contacts
 *  - excludeUnknown: true/false (default: false) - Exclude "Unknown" names
 *  - validateNumber: true/false (default: true) - Validate phone numbers
 */
const getContactStats = async (req, res) => {
  try {
    // Check if client is ready
    if (!isReady()) {
      return res.status(503).json({
        success: false,
        error: "WhatsApp client not ready. Please scan QR code first.",
      });
    }

    // Parse query parameters
    const savedOnly = req.query.savedOnly === "true";
    const excludeUnknown = req.query.excludeUnknown === "true";
    const validateNumber = req.query.validateNumber !== "false"; // Default true

    // Get all contacts with filters
    const contacts = await getAllContacts({
      savedOnly,
      excludeUnknown,
      validateNumber,
    });

    // Calculate statistics
    const stats = {
      total: contacts.length,
      saved: contacts.filter((c) => c.isMyContact).length,
      unsaved: contacts.filter((c) => !c.isMyContact).length,
      business: contacts.filter((c) => c.isBusiness).length,
      regular: contacts.filter((c) => !c.isBusiness).length,
      unknown: contacts.filter((c) => c.name === "Unknown").length,
    };

    res.status(200).json({
      success: true,
      message: "Contact statistics retrieved successfully",
      filters: {
        savedOnly,
        excludeUnknown,
        validateNumber,
      },
      stats: stats,
    });
  } catch (err) {
    console.error("❌ Error calculating contact stats:", err);

    res.status(500).json({
      success: false,
      error: "Failed to calculate contact statistics",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Export contacts as CSV file
 * Query Parameters: Same as getContacts (savedOnly, excludeUnknown, validateNumber)
 */
const exportContactsCSV = async (req, res) => {
  try {
    // Check if client is ready
    if (!isReady()) {
      return res.status(503).json({
        success: false,
        error: "WhatsApp client not ready. Please scan QR code first.",
      });
    }

    // Parse query parameters
    const savedOnly = req.query.savedOnly === "true";
    const excludeUnknown = req.query.excludeUnknown === "true";
    const validateNumber = req.query.validateNumber !== "false"; // Default true

    // Get all contacts with filters
    const contacts = await getAllContacts({
      savedOnly,
      excludeUnknown,
      validateNumber,
    });

    // Generate CSV content
    // const csvHeader = "Name,Number,WhatsApp ID,Saved,Business,Short Name\n";
    const csvHeader = "Name,Number\n";
    const csvRows = contacts
      .map((contact) => {
        // Escape commas and quotes in name
        const name = contact.name
          ? contact.name.replace(/"/g, '""')
          : "Unknown";
        // const shortName = contact.shortName
        //   ? contact.shortName.replace(/"/g, '""')
        //   : "";

        // Fix number - add tab prefix to force Excel to treat as text
        // This prevents scientific notation in Excel
        const number = `="${contact.number}"`;

        return [
          `"${name}"`,
          number,
          // contact.isMyContact ? "Yes" : "No",
          // contact.isBusiness ? "Yes" : "No",
          // shortName ? `"${shortName}"` : "",
        ].join(",");
      })
      .join("\n");

    const csvContent = csvHeader + csvRows;

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filterSuffix = savedOnly ? "_saved" : "";
    const filename = `whatsapp_contacts${filterSuffix}_${timestamp}.csv`;

    console.log(`✅ Exported ${contacts.length} contacts to CSV`);

    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", Buffer.byteLength(csvContent, "utf-8"));

    // Send CSV file
    res.status(200).send(csvContent);
  } catch (err) {
    console.error("❌ Error exporting contacts:", err);

    res.status(500).json({
      success: false,
      error: "Failed to export contacts",
      message: err.message || "Unknown error",
    });
  }
};

module.exports = {
  getContacts,
  getContactStats,
  exportContactsCSV,
};
