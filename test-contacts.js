/**
 * Test script for Contacts API
 * Run this after scanning QR code and client is ready
 */

const axios = require("axios");

const BASE_URL = "http://localhost:3000";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  red: "\x1b[31m",
};

async function testGetAllContacts() {
  console.log(`\n${colors.blue}📇 Testing: Get All Contacts${colors.reset}`);
  console.log("=".repeat(50));

  try {
    const response = await axios.get(`${BASE_URL}/contacts`);
    const data = response.data;

    if (data.success) {
      console.log(`${colors.green}✅ Success!${colors.reset}`);
      console.log(`📊 Total Contacts: ${data.total}`);
      console.log(`\n${colors.yellow}First 10 Contacts:${colors.reset}`);

      // Show first 10 contacts
      data.contacts.slice(0, 10).forEach((contact, index) => {
        const businessTag = contact.isBusiness ? " [Business]" : "";
        const savedTag = contact.isMyContact ? " ⭐" : "";
        console.log(`  ${index + 1}. ${contact.name}${businessTag}${savedTag}`);
        console.log(`     📱 ${contact.number}`);
      });

      if (data.total > 10) {
        console.log(`  ... and ${data.total - 10} more contacts`);
      }
    } else {
      console.log(`${colors.red}❌ Failed: ${data.error}${colors.reset}`);
    }
  } catch (error) {
    if (error.response) {
      console.log(
        `${colors.red}❌ Error: ${error.response.data.error}${colors.reset}`
      );
      console.log(`Message: ${error.response.data.message}`);
    } else {
      console.log(
        `${colors.red}❌ Network Error: ${error.message}${colors.reset}`
      );
    }
  }
}

async function testGetContactStats() {
  console.log(
    `\n${colors.blue}📊 Testing: Get Contact Statistics${colors.reset}`
  );
  console.log("=".repeat(50));

  try {
    const response = await axios.get(`${BASE_URL}/contacts/stats`);
    const data = response.data;

    if (data.success) {
      console.log(`${colors.green}✅ Success!${colors.reset}`);
      console.log(`\n${colors.yellow}Contact Statistics:${colors.reset}`);
      console.log(`  📱 Total Contacts:    ${data.stats.total}`);
      console.log(`  ⭐ Saved Contacts:    ${data.stats.saved}`);
      console.log(`  ❓ Unsaved Contacts:  ${data.stats.unsaved}`);
      console.log(`  💼 Business Accounts: ${data.stats.business}`);
      console.log(`  👤 Regular Accounts:  ${data.stats.regular}`);

      // Calculate percentages
      if (data.stats.total > 0) {
        const savedPercent = (
          (data.stats.saved / data.stats.total) *
          100
        ).toFixed(1);
        const businessPercent = (
          (data.stats.business / data.stats.total) *
          100
        ).toFixed(1);

        console.log(`\n${colors.yellow}Percentages:${colors.reset}`);
        console.log(`  ⭐ Saved:    ${savedPercent}%`);
        console.log(`  💼 Business: ${businessPercent}%`);
      }
    } else {
      console.log(`${colors.red}❌ Failed: ${data.error}${colors.reset}`);
    }
  } catch (error) {
    if (error.response) {
      console.log(
        `${colors.red}❌ Error: ${error.response.data.error}${colors.reset}`
      );
      console.log(`Message: ${error.response.data.message}`);
    } else {
      console.log(
        `${colors.red}❌ Network Error: ${error.message}${colors.reset}`
      );
    }
  }
}

async function testClientStatus() {
  console.log(`\n${colors.blue}ℹ️  Testing: Client Status${colors.reset}`);
  console.log("=".repeat(50));

  try {
    const response = await axios.get(`${BASE_URL}/info`);
    const data = response.data;

    console.log(`Status: ${data.status}`);

    if (data.clientInfo) {
      console.log(`${colors.green}✅ Client is ready!${colors.reset}`);
      console.log(
        `User: ${data.clientInfo.user.name} (${data.clientInfo.user.id})`
      );
      console.log(`Platform: ${data.clientInfo.platform}`);
    } else {
      console.log(
        `${colors.yellow}⚠️  Client not ready. Please scan QR code first.${colors.reset}`
      );
    }
  } catch (error) {
    console.log(
      `${colors.red}❌ Could not check status: ${error.message}${colors.reset}`
    );
  }
}

// Main execution
async function runAllTests() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(
    `${colors.blue}🧪 WhatsApp Contacts API Test Suite${colors.reset}`
  );
  console.log(`${"=".repeat(50)}`);

  // Check client status first
  await testClientStatus();

  // Wait a bit
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test contacts endpoints
  await testGetContactStats();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await testGetAllContacts();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`${colors.green}✅ All tests completed!${colors.reset}`);
  console.log(`${"=".repeat(50)}\n`);
}

// Run tests
runAllTests().catch((error) => {
  console.error(`${colors.red}Fatal Error:${colors.reset}`, error);
  process.exit(1);
});
