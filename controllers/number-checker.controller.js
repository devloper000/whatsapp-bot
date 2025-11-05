const {
  isReady,
  checkNumberExists,
  getContactDetails,
} = require("../services/whatsapp.service");
const { generateNumber } = require("../utils/numberGenerator");
const VerifiedNumber = require("../models/VerifiedNumber");
const {
  parsePhoneNumber,
  getCountries,
  getCountryCallingCode,
} = require("libphonenumber-js");
const countries = require("i18n-iso-countries");

/**
 * Check dynamically generated numbers on WhatsApp
 * Numbers are generated in format: 923[0-4][8 random digits]
 * Total length: 12 digits (e.g., 923000000001)
 *
 * Query parameters:
 * - count: number of numbers to generate and check (default: 100)
 */
const checkNumbers = async (req, res) => {
  try {
    // Check if client is ready
    if (!isReady()) {
      return res.status(503).json({
        success: false,
        error: "WhatsApp client not ready. Please scan QR code first.",
        message: "Client not connected",
      });
    }

    // Get count from query parameter (default: 100)
    const count = parseInt(req.query.count) || 5;

    console.log(`🔍 Generating and checking ${count} random numbers...`);

    const results = [];
    let checkedCount = 0;
    let validCount = 0;
    let invalidCount = 0;
    let savedCount = 0;
    let alreadyExistsCount = 0;
    let dbErrors = 0;

    // Generate and check numbers one by one
    for (let i = 0; i < count; i++) {
      try {
        // Generate a random number
        const generatedNumber = generateNumber();

        // Add @c.us suffix for WhatsApp
        const whatsappNumber = generatedNumber + "@c.us";

        // Check if number exists on WhatsApp
        const isValid = await checkNumberExists(whatsappNumber);

        checkedCount++;

        if (isValid) {
          validCount++;

          // Check if number already exists in DB
          const existingNumber = await VerifiedNumber.findOne({
            number: generatedNumber,
          });

          if (existingNumber) {
            alreadyExistsCount++;
          } else {
            // Save new valid number to database
            try {
              const savedNumber = await VerifiedNumber.create({
                number: generatedNumber,
              });
              savedCount++;
              results.push({
                number: generatedNumber,
                status: "saved",
                reason: "new_valid_number",
                isValid: true,
                createdAt: new Date(savedNumber.createdAt).toLocaleString(),
                updatedAt: new Date(savedNumber.updatedAt).toLocaleString(),
              });
            } catch (dbError) {
              // Handle duplicate key errors (race condition)
              if (dbError.code === 11000) {
                alreadyExistsCount++;
              } else {
                dbErrors++;
              }
            }
          }
        } else {
          invalidCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        checkedCount++;
      }
    }

    console.log("🚀 All numbers checked successfully");

    res.status(200).json({
      success: true,
      message: "Number generation and check completed",
      summary: {
        totalChecked: checkedCount,
        validNumbers: validCount,
        invalidNumbers: invalidCount,
        newSaved: savedCount,
        alreadyExists: alreadyExistsCount,
        dbErrors: dbErrors,
      },
      results: results,
    });
  } catch (err) {
    console.error("❌ Error in number checking process:", err);

    res.status(500).json({
      success: false,
      error: "Failed to check numbers",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Generate sample numbers (preview without checking)
 * Query parameters:
 * - count: number of sample numbers to generate (default: 10)
 */
const getNumbersList = async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 10;
    const { generateNumbers } = require("../utils/numberGenerator");

    const sampleNumbers = generateNumbers(count);

    res.status(200).json({
      success: true,
      message: "Sample numbers generated",
      format: "923[0-4][8 random digits] (12 digits total)",
      total: sampleNumbers.length,
      numbers: sampleNumbers,
    });
  } catch (err) {
    console.error("❌ Error generating sample numbers:", err);

    res.status(500).json({
      success: false,
      error: "Failed to generate sample numbers",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Get all verified numbers from database with pagination
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
const getVerifiedNumbers = async (req, res) => {
  try {
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await VerifiedNumber.countDocuments();

    // Get paginated numbers
    const verifiedNumbers = await VerifiedNumber.find()
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    console.log(
      `📋 Retrieved ${verifiedNumbers.length} verified numbers from DB (Page ${page}/${totalPages})`
    );

    res.status(200).json({
      success: true,
      message: "Verified numbers retrieved from database",
      data: {
        numbers: verifiedNumbers,
        pagination: {
          total: total,
          totalPages: totalPages,
          currentPage: page,
          limit: limit,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage,
        },
      },
    });
  } catch (err) {
    console.error("❌ Error fetching verified numbers:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch verified numbers",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Get statistics of verified numbers in database
 */
const getVerifiedStats = async (req, res) => {
  try {
    const total = await VerifiedNumber.countDocuments();
    const mostRecent = await VerifiedNumber.findOne()
      .sort({ updatedAt: -1 })
      .lean();

    const stats = {
      totalVerified: total,
      lastUpdated: mostRecent ? mostRecent.updatedAt : null,
      lastNumber: mostRecent ? mostRecent.number : null,
    };

    res.status(200).json({
      success: true,
      message: "Database statistics retrieved",
      stats: stats,
    });
  } catch (err) {
    console.error("❌ Error fetching stats:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Delete a verified number from database
 */
const deleteVerifiedNumber = async (req, res) => {
  try {
    const { number } = req.params;

    if (!number) {
      return res.status(400).json({
        success: false,
        error: "Number is required",
      });
    }

    // Remove @c.us if present
    const cleanNumber = number.replace("@c.us", "");

    const deleted = await VerifiedNumber.findOneAndDelete({
      number: cleanNumber,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Number not found in database",
      });
    }

    res.status(200).json({
      success: true,
      message: "Number deleted successfully",
      deletedNumber: deleted,
    });
  } catch (err) {
    console.error("❌ Error deleting number:", err);

    res.status(500).json({
      success: false,
      error: "Failed to delete number",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Clear all verified numbers from database
 */
const clearAllVerifiedNumbers = async (req, res) => {
  try {
    const result = await VerifiedNumber.deleteMany({});

    console.log(`🗑️  Cleared ${result.deletedCount} numbers from database`);

    res.status(200).json({
      success: true,
      message: "All verified numbers cleared",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("❌ Error clearing numbers:", err);

    res.status(500).json({
      success: false,
      error: "Failed to clear numbers",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Export verified numbers as CSV
 */
const exportVerifiedNumbersCSV = async (req, res) => {
  try {
    const verifiedNumbers = await VerifiedNumber.find()
      //   .sort({ updatedAt: -1 })
      .sort({ number: 1 })
      .lean();

    // Generate CSV content (clean format)
    const csvHeader = "Number\n";
    const csvRows = verifiedNumbers
      .map((num) => {
        const number = num.number;
        // const createdAt = new Date(num.createdAt).toLocaleString();
        // const updatedAt = new Date(num.updatedAt).toLocaleString();

        return [`"${number}"`].join(",");
      })
      .join("\n");

    const csvContent = csvHeader + csvRows;

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `verified_whatsapp_numbers_${timestamp}.csv`;

    console.log(
      `📥 Exported ${verifiedNumbers.length} verified numbers to CSV`
    );

    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", Buffer.byteLength(csvContent, "utf-8"));

    // Send CSV file
    res.status(200).send(csvContent);
  } catch (err) {
    console.error("❌ Error exporting verified numbers:", err);

    res.status(500).json({
      success: false,
      error: "Failed to export verified numbers",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Check a single number from any country
 * Body/Query parameters:
 * - number: Phone number to check (with or without country code)
 * - countryCode: Optional country code (e.g., 'PK', 'US', 'IN')
 */
const checkSingleNumber = async (req, res) => {
  try {
    // Check if client is ready
    if (!isReady()) {
      return res.status(503).json({
        success: false,
        error: "WhatsApp client not ready. Please scan QR code first.",
        message: "Client not connected",
      });
    }

    // Get number and country code from query or body
    let number = req.query.number || req.body.number;
    let countryCode = req.query.countryCode || req.body.countryCode;

    if (!number) {
      return res.status(400).json({
        success: false,
        error: "Number is required",
        message: "Please provide a number",
      });
    }

    // Clean the number (remove spaces, dashes, etc.)
    const cleanNumber = number.replace(/[\s\-\(\)]/g, "");

    let phoneNumber;
    let formattedNumber;
    let countryCodeDetected;
    let countryName;

    try {
      // Try to parse the phone number
      // If country code is provided, use it for parsing
      if (countryCode) {
        // If number doesn't start with +, add it
        const numberWithPlus = cleanNumber.startsWith("+")
          ? cleanNumber
          : `+${cleanNumber}`;
        phoneNumber = parsePhoneNumber(
          numberWithPlus,
          countryCode.toUpperCase()
        );
      } else {
        // Try to parse without country code (will auto-detect)
        const numberWithPlus = cleanNumber.startsWith("+")
          ? cleanNumber
          : `+${cleanNumber}`;
        phoneNumber = parsePhoneNumber(numberWithPlus);
      }

      // Validate the parsed number
      if (!phoneNumber.isValid()) {
        return res.status(400).json({
          success: false,
          error: "Invalid phone number",
          message: "Please enter a valid phone number with country code",
          providedNumber: number,
        });
      }

      // Get formatted number and country info
      formattedNumber = phoneNumber.nationalNumber; // National number without country code
      countryCodeDetected = phoneNumber.country;
      countryName = phoneNumber.countryCallingCode;

      // For WhatsApp, we need full international number without +
      const internationalNumber = phoneNumber.number.replace("+", "");

      console.log(
        `🔍 Checking number: ${internationalNumber} (${countryCodeDetected})`
      );

      // Add @c.us suffix for WhatsApp
      const whatsappNumber = internationalNumber + "@c.us";

      // Check if number exists on WhatsApp
      const isValid = await checkNumberExists(whatsappNumber);

      // Get contact details if number is valid
      let contactDetails = null;
      if (isValid) {
        try {
          contactDetails = await getContactDetails(whatsappNumber);
        } catch (contactError) {
          console.log("Could not fetch contact details:", contactError.message);
          // Continue even if contact details fail
        }
      }

      // Prepare response
      const result = {
        success: true,
        number: {
          original: number,
          international: phoneNumber.number,
          national: formattedNumber,
          countryCode: countryCodeDetected,
          callingCode: countryName,
        },
        validation: {
          isRegisteredOnWhatsApp: isValid,
        },
        message: isValid
          ? "✅ Number is registered on WhatsApp"
          : "❌ Number is not registered on WhatsApp",
      };

      // Add contact details if available
      if (contactDetails) {
        result.contact = {
          name: contactDetails.name,
          pushname: contactDetails.pushname,
          shortName: contactDetails.shortName,
          isMyContact: contactDetails.isMyContact,
          isBusiness: contactDetails.isBusiness,
          isVerified: contactDetails.isVerified,
          isEnterprise: contactDetails.isEnterprise,
          profilePicUrl: contactDetails.profilePicUrl,
        };
      }

      // If valid, optionally save to database (save international number)
      if (isValid) {
        try {
          const existingNumber = await VerifiedNumber.findOne({
            number: internationalNumber,
          });

          if (!existingNumber) {
            await VerifiedNumber.create({
              number: internationalNumber,
            });
            result.savedToDatabase = true;
          } else {
            result.savedToDatabase = false;
            result.alreadyInDatabase = true;
          }
        } catch (dbError) {
          console.error("Database error:", dbError);
          result.savedToDatabase = false;
          result.dbError = true;
        }
      }

      res.status(200).json(result);
    } catch (parseError) {
      // If parsing fails, return error
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format",
        message:
          parseError.message ||
          "Please enter a valid phone number with country code",
        providedNumber: number,
        hint: countryCode
          ? `Try with format: +${countryCode}XXXXXXXXXX`
          : "Try with format: +92XXXXXXXXXX or include country code",
      });
    }
  } catch (err) {
    console.error("❌ Error checking single number:", err);

    res.status(500).json({
      success: false,
      error: "Failed to check number",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Get list of all countries with their calling codes
 * Returns countries supported by libphonenumber-js with their ISO codes, names, and calling codes
 */
const getCountriesList = async (req, res) => {
  try {
    // Register English locale for country names
    countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

    // Get all supported countries from libphonenumber-js
    const supportedCountries = getCountries();

    // Build countries list with names and calling codes
    const countriesList = supportedCountries
      .map((countryCode) => {
        try {
          const callingCode = getCountryCallingCode(countryCode);
          const countryName = countries.getName(countryCode, "en");

          if (!countryName) return null;

          return {
            code: countryCode,
            name: countryName,
            callingCode: callingCode,
            flag: getCountryFlag(countryCode),
          };
        } catch (error) {
          // Skip countries that don't have calling codes
          return null;
        }
      })
      .filter((country) => country !== null)
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

    res.status(200).json({
      success: true,
      message: "Countries list retrieved successfully",
      total: countriesList.length,
      countries: countriesList,
    });
  } catch (err) {
    console.error("❌ Error fetching countries list:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch countries list",
      message: err.message || "Unknown error",
    });
  }
};

/**
 * Helper function to get country flag emoji
 */
function getCountryFlag(countryCode) {
  // Convert country code to flag emoji
  // Country codes are 2 letters, convert to flag using regional indicator symbols
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

module.exports = {
  checkNumbers,
  getNumbersList,
  getVerifiedNumbers,
  getVerifiedStats,
  deleteVerifiedNumber,
  clearAllVerifiedNumbers,
  exportVerifiedNumbersCSV,
  checkSingleNumber,
  getCountriesList,
};
