const { mongoose } = require('../../../shared/db/connection');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  email: { type: String, unique: true, sparse: true },
  password: String,
  walletAddresses: [{ chain: String, address: String }],
  displayName: String,
  roles: { type: [String], default: ["player"] },
  kycStatus: {
    type: String,
    enum: ["none", "pending", "approved", "rejected"],
    default: "none",
  },
  emailVerified: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null },
  twoFactorTempSecret: { type: String, default: null },
  isTwoFactorEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => new Date() },
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
