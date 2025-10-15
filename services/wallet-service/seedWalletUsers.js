// seedWalletUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const Wallet = require('./src/models/Wallet');

const wallets = [
  { userId: '68eb94c22a7983ea19b0bd6a', balances: [{ currency: 'sol', amount: 0 }] },
  { userId: '68eb94c22a7983ea19b0bd6b', balances: [{ currency: 'sol', amount: 5 }] },
  { userId: '68eb94c22a7983ea19b0bd6c', balances: [{ currency: 'btc', amount: 0.01 }] },
  { userId: '68eb94c22a7983ea19b0bd6d', balances: [{ currency: 'eth', amount: 0.3 }] },
  { userId: '68eb94c22a7983ea19b0bd6e', balances: [{ currency: 'usdt', amount: 150 }] },
  { userId: '68eb94c22a7983ea19b0bd6f', balances: [{ currency: 'sol', amount: 1 }] },
  { userId: '68eb94c22a7983ea19b0bd60', balances: [{ currency: 'btc', amount: 0.002 }] },
  { userId: '68eb94c22a7983ea19b0bd61', balances: [{ currency: 'eth', amount: 2 }] },
  { userId: '68eb94c22a7983ea19b0bd62', balances: [{ currency: 'usdc', amount: 100 }] },
  { userId: '68eb94c22a7983ea19b0bd63', balances: [{ currency: 'sol', amount: 3.5 }] }
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB (wallet-service)');
    await Wallet.deleteMany({});
    await Wallet.insertMany(wallets);
    console.log('✅ Inserted 10 wallet users');
    await mongoose.disconnect();
    console.log('✅ Done!');
  } catch (err) {
    console.error('❌ Error seeding wallet users:', err);
  }
})();
