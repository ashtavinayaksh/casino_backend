const { mongoose } = require('../db/connection');

const BalanceSchema = new mongoose.Schema({
  currency: { type: String, required: true }, // 'USDT','BTC','ETH','USD','INR'
  amount: { type: mongoose.Types.Decimal128, required: true, default: "0" },
  locked: { type: mongoose.Types.Decimal128, default: "0" } // for pending withdrawals/reservations
}, { _id: false });

const WalletSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  balances: { type: [BalanceSchema], default: [] },
  preferredCurrency: { type: String, default: 'USDT' }, // user preference
  updatedAt: { type: Date, default: () => new Date() }
});

WalletSchema.index({ userId: 1 });

module.exports = mongoose.model('Wallet', WalletSchema);
