const { mongoose } = require('../../../shared/db/connection');

const PaymentAddressSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  currency: { type: String, index: true }, // e.g., 'sol', 'btc', 'usdt_trc20'
  paymentId: { type: String, index: true },
  payAddress: { type: String, index: true },
  network: { type: String },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
}, { indexes: [{ userId: 1, currency: 1, unique: true }] });

PaymentAddressSchema.pre('save', function(next){ this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('PaymentAddress', PaymentAddressSchema);
