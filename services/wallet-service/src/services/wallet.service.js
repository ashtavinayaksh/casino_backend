const Wallet = require('../models/Wallet');
const PaymentAddress = require('../models/PaymentAddress');
const Transaction = require('../models/Transaction');
const nowp = require('../lib/nowpayments');

async function ensureWallet(userId) {
  let w = await Wallet.findOne({ userId });
  if(!w) w = await Wallet.create({ userId, balances: [] });
  return w;
}

async function getOrCreateDepositAddress({ userId, currency, nowpApiKey, ipnUrl }) {
  const c = currency.toLowerCase();
  let rec = await PaymentAddress.findOne({ userId, currency: c });
  if (rec) return rec;

  // Price 1 USD as per NOWP static-address pattern
  const p = await nowp.createPayment({
    apiKey: nowpApiKey,
    price_amount: 10,
    price_currency: 'usd',
    pay_currency: c,
    order_id: userId,
    ipn_callback_url: ipnUrl,
    is_fixed_rate: false,
  });

  rec = await PaymentAddress.create({
    userId, currency: c,
    paymentId: String(p.payment_id),
    payAddress: p.pay_address,
    network: p.network || null
  });

  return rec;
}

async function creditDeposit({ userId, currency, amount, externalId, txHash, metadata }) {
  const wallet = await ensureWallet(userId);
  const bal = wallet.getBalance(currency);
  bal.amount += Number(amount);
  await wallet.save();

  const tx = await Transaction.create({
    userId, type: 'deposit', currency: currency.toLowerCase(),
    amount: Number(amount), status: 'confirmed',
    externalId, txHash, metadata
  });

  return { wallet, tx };
}

async function requestWithdraw({ userId, currency, amount, address }) {
  // Create pending withdraw request
  const tx = await Transaction.create({
    userId, type: 'withdraw', currency: currency.toLowerCase(),
    amount: Number(amount), status: 'pending', metadata: { address }
  });
  return tx;
}

async function finalizeWithdraw({ txId, status, externalId, txHash, metadata }) {
  const tx = await Transaction.findById(txId);
  if(!tx) throw new Error('Withdraw not found');

  tx.status = status;
  if (externalId) tx.externalId = externalId;
  if (txHash) tx.txHash = txHash;
  if (metadata) tx.metadata = { ...(tx.metadata||{}), ...metadata };
  await tx.save();

  // Deduct on success
  if (status === 'finished' || status === 'confirmed') {
    const wallet = await ensureWallet(tx.userId);
    const bal = wallet.getBalance(tx.currency);
    bal.amount -= Number(tx.amount);
    if (bal.amount < 0) bal.amount = 0;
    await wallet.save();
  }
  return tx;
}

async function listTransactions(userId, limit=50) {
  return Transaction.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
}

async function getBalance(userId) {
  const w = await ensureWallet(userId);
  return w.balances;
}

module.exports = {
  ensureWallet,
  getOrCreateDepositAddress,
  creditDeposit,
  requestWithdraw,
  finalizeWithdraw,
  listTransactions,
  getBalance,
};
