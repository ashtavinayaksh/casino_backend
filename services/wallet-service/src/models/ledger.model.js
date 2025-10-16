const { mongoose } = require('../db/connection');

const LedgerSchema = new mongoose.Schema({
  txId: { type: String, required: true, unique: true }, // idempotency key
  fromAccount: { type: String, required: true }, // e.g., user:123, house:USDT, external:moonpay
  toAccount: { type: String, required: true },
  currency: { type: String, required: true },
  amount: { type: mongoose.Types.Decimal128, required: true }, // positive
  type: { type: String, enum: ['deposit','wager','payout','withdrawal','fee','cashback','adjust','exchange'], required: true },
  status: { type: String, enum: ['pending','completed','failed'], default: 'completed' },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: () => new Date() }
});

LedgerSchema.index({ fromAccount:1, createdAt:-1 });
LedgerSchema.index({ toAccount:1, createdAt:-1 });

module.exports = mongoose.model('Ledger', LedgerSchema);
