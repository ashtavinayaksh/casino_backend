// models/Wallet.js
const { mongoose } = require('../db/connection');

const BalanceSchema = new mongoose.Schema({
  currency: { type: String, index: true },
  amount: { type: Number, default: 0 },   // available
  locked: { type: Number, default: 0 },   // in-play
}, { _id: false });

const WalletSchema = new mongoose.Schema({
  userId: { type: String, unique: true, index: true },
  gameCurrency: { type: String, default: "USD" },
  balances: { type: [BalanceSchema], default: [] },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
});

WalletSchema.methods.getBalance = function (currency) {
  const c = currency.toLowerCase();
  let row = this.balances.find(b => b.currency === c);
  if (!row) { row = { currency: c, amount: 0, locked: 0 }; this.balances.push(row); }
  return row;
};

WalletSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Wallet', WalletSchema);
