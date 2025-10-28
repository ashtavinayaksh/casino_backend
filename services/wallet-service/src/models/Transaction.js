const { mongoose } = require('../db/connection');

const TransactionSchema = new mongoose.Schema({
  userId: { type: String, index: true },

  type: { 
    type: String, 
    enum: ['deposit', 'withdraw', 'bet', 'win', 'refund', 'rollback'], 
    index: true 
  },

  currency: { type: String, index: true },
  amount: { type: Number },

  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'finished', 'failed', 'cancelled'], 
    default: 'pending', 
    index: true 
  },

  externalId: { type: String },
  txHash: { type: String },
  metadata: { type: Object },

  // 🎮 game
  game_uuid: { type: String },

  // Slotegrator's unique id for this operation - make unique
  transaction_id: { type: String, unique: true, index: true },

  // optional: reference a previous tx (e.g., refund pointing to bet)
  ref_transaction_id: { type: String },

  balance_after: { type: Number },

  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
});

TransactionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema);
