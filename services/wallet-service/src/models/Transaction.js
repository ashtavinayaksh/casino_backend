const { mongoose } = require('../db/connection');

const TransactionSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  type: { type: String, enum: ['deposit', 'withdraw'], index: true },
  currency: { type: String, index: true },
  amount: { type: Number },
  status: { type: String, enum: ['pending', 'confirmed', 'finished', 'failed', 'cancelled'], default: 'pending', index: true },
  externalId: { type: String }, // NOWPayments payment_id or payout id
  txHash: { type: String },
  metadata: { type: Object },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
});

TransactionSchema.pre('save', function(next){ this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('Transaction', TransactionSchema);
