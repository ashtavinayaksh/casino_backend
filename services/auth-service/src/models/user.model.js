const { mongoose } = require('../../../shared/db/connection');

const UserSchema = new mongoose.Schema({
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
  createdAt: { type: Date, default: () => new Date() },
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
