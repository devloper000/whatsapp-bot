const mongoose = require("mongoose");

const verifiedNumberSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: true,
      unique: true, // Prevent duplicates - stores clean number without @c.us
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Index for faster queries
verifiedNumberSchema.index({ number: 1 });

const VerifiedNumber = mongoose.model("VerifiedNumber", verifiedNumberSchema);

module.exports = VerifiedNumber;
