require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../../shared/db/connection');
const { init: initRedis, redisClient } = require('../../shared/redis/redisClient');
const Withdrawal = require('../models/withdrawal.model');
const Ledger = require('../models/ledger.model');
const Wallet = require('../models/wallet.model');
const Decimal = require('decimal.js');

// Mock provider (replace with real provider API, e.g., NowPayments or Fireblocks)
const provider = {
  async sendPayout({ toAddress, amount, currency }) {
    console.log(`💸 Sending payout ${amount} ${currency} to ${toAddress}`);
    await new Promise(r => setTimeout(r, 1000));
    return { id: `tx_${Date.now()}` };
  }
};

async function processWithdrawals() {
  await connectDB(process.env.MONGO_URI);
  await initRedis(process.env.REDIS_URL || 'redis://localhost:6379');

  console.log('🚀 Withdrawal worker started and connected');

  while (true) {
    try {
      // Read from Redis stream
      const messages = await redisClient.xRead(
        { key: 'stream:withdrawals', id: '$' },
        { BLOCK: 5000, COUNT: 1 }
      );

      if (!messages) continue;

      for (const stream of messages) {
        const [streamName, entries] = stream;
        for (const entry of entries) {
          const [entryId, fields] = entry;
          const withdrawalId = fields.withdrawalId;

          const wd = await Withdrawal.findOne({ withdrawalId });
          if (!wd || wd.status !== 'requested') continue;

          console.log(`🔄 Processing withdrawal ${withdrawalId}`);

          wd.status = 'processing';
          await wd.save();

          try {
            const tx = await provider.sendPayout({
              toAddress: wd.toAddress,
              amount: wd.amount,
              currency: wd.currency,
            });

            // Update withdrawal and ledger
            wd.status = 'completed';
            wd.updatedAt = new Date();
            wd.metadata = { providerTx: tx.id };
            await wd.save();

            await Ledger.updateOne({ txId: withdrawalId }, { $set: { status: 'completed' } });

            console.log(`✅ Withdrawal completed: ${withdrawalId}`);
          } catch (err) {
            console.error(`❌ Withdrawal failed: ${withdrawalId}`, err.message);

            wd.status = 'failed';
            wd.metadata = { error: err.message };
            await wd.save();

            // Unlock locked funds
            const userId = wd.userId;
            const amount = new Decimal(wd.amount.toString());
            await Wallet.updateOne(
              { userId, 'balances.currency': wd.currency },
              {
                $inc: {
                  'balances.$.amount': mongoose.Types.Decimal128.fromString(amount.toString()),
                  'balances.$.locked': mongoose.Types.Decimal128.fromString(amount.negated().toString())
                }
              }
            );
          }
        }
      }
    } catch (err) {
      console.error('Worker loop error:', err);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

processWithdrawals().catch(console.error);
