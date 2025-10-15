const { mongoose } = require('../../../shared/db/connection');

const WithdrawalSchema = new mongoose.Schema({
  withdrawalId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  currency: String,
  amount: mongoose.Types.Decimal128,
  fee: mongoose.Types.Decimal128,
  toAddress: String,
  method: String, // 'onchain','custodial','manual'
  status: { type: String, enum: ['requested','processing','completed','failed','cancelled'], default: 'requested' },
  createdAt: Date,
  updatedAt: Date,
  metadata: Object
});
WithdrawalSchema.index({ userId:1, status:1, createdAt:-1 });
module.exports = mongoose.model('Withdrawal', WithdrawalSchema);
