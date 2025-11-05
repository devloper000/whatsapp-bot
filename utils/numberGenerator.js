/**
 * Generate random Pakistani WhatsApp numbers
 * Format: 923[0-4][8 random digits]
 * Total length: 12 digits (e.g., 923000000001)
 *
 * Rules:
 * - 923 is static (3 digits)
 * - 4th digit can be 0-4 (1 digit)
 * - Remaining 8 digits can be 0-9
 */

/**
 * Generate a single random WhatsApp number
 * @returns {string} Generated number (e.g., "923000000001")
 */
function generateNumber() {
  // Static prefix
  const prefix = "923";

  // 4th digit: 0-4
  const fourthDigit = Math.floor(Math.random() * 5); // 0, 1, 2, 3, or 4

  // Remaining 8 digits: random 0-9 (to make total 12 digits: 3 + 1 + 8 = 12)
  let remainingDigits = "";
  for (let i = 0; i < 8; i++) {
    remainingDigits += Math.floor(Math.random() * 10);
  }

  return prefix + fourthDigit + remainingDigits;
}

/**
 * Generate multiple unique random WhatsApp numbers
 * @param {number} count - Number of unique numbers to generate
 * @returns {string[]} Array of unique generated numbers
 */
function generateNumbers(count) {
  const numbers = new Set();

  while (numbers.size < count) {
    numbers.add(generateNumber());
  }

  return Array.from(numbers);
}

module.exports = {
  generateNumber,
  generateNumbers,
};
