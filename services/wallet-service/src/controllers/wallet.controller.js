const svc = require('../services/wallet.service');
const nowp = require('../lib/nowpayments');

async function getCoins(req, res) {
  try {
    const data = await nowp.listCoins(process.env.NOWP_API_KEY);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getDepositAddress(req, res) {
  const { userId } = req.params;
  const { currency='sol' } = req.query;
  try {
    const rec = await svc.getOrCreateDepositAddress({
      userId, currency,
      nowpApiKey: process.env.NOWP_API_KEY,
      ipnUrl: process.env.NOWP_IPN_URL
    });
    res.json({ userId, currency: rec.currency, payAddress: rec.payAddress, paymentId: rec.paymentId, network: rec.network });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getBalance(req, res) {
  const { userId } = req.params;
  try {
    const balances = await svc.getBalance(userId);
    res.json({ userId, balances });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getTransactions(req, res) {
  const { userId } = req.params;
  try {
    const txs = await svc.listTransactions(userId, Number(req.query.limit||50));
    res.json({ userId, transactions: txs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function requestWithdraw(req, res) {
  const { userId } = req.params;
  const { currency, amount, address } = req.body;
  if(!currency || !amount || !address) return res.status(400).json({ error: 'currency, amount, address required' });
  try {
    const tx = await svc.requestWithdraw({ userId, currency, amount, address });
    res.json({ requestId: tx._id, status: tx.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Admin/worker endpoint to execute payout via NOWPayments
async function executeWithdraw(req, res) {
  const { txId } = req.params;
  try {
    const tx = await require('../models/Transaction').findById(txId);
    if(!tx) return res.status(404).json({ error: 'not found' });
    if(tx.status !== 'pending') return res.status(400).json({ error: 'already processed' });

    const result = await nowp.createPayout({
  email: process.env.NOWP_EMAIL,
  password: process.env.NOWP_PASSWORD,
  withdrawals: [
    {
      address: tx.metadata.address,
      amount: tx.amount,
      currency: tx.currency,
      ipn_callback_url: process.env.NOWP_IPN_URL,
    },
  ],
});


    const updated = await svc.finalizeWithdraw({
      txId,
      status: 'confirmed',
      externalId: String(result?.id || result?.payout_id || ''),
      txHash: result?.tx_hash || null,
      metadata: { nowp: result }
    });

    res.json({ ok: true, tx: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getCoins, getDepositAddress, getBalance, getTransactions, requestWithdraw, executeWithdraw };
