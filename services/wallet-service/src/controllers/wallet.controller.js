const svc = require('../services/wallet.service');
const nowp = require('../lib/nowpayments');
const { getUsdRates } = require('../lib/price');
const Transaction = require('../models/Transaction');
const User = require('../../../auth-service/src/models/user.model');
const nodemailer = require('nodemailer');

// Store OTPs temporarily (use Redis in prod)
const pendingOtps = new Map();

// Setup mailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function getCoins(req, res) {
  try {
    const data = await nowp.listCoins(process.env.NOWP_API_KEY);
    console.log("NOWPayments raw:", JSON.stringify(data.selectedCurrencies?.slice(0, 20)));

    // full array of supported coins
    const symbols = data.selectedCurrencies || [];

    // Pick top 15 common cryptos (you can reorder as you wish)
    const topCoins = [
      "BTC",
      "ETH",
      "USDTTRC20",
      "SOL",
      "BNBMAINNET",
      "XRP",
      "ADA",
      "DOGECOIN",
      "TRX",
      "LTC",
      "DOT",
      "MATICMAINNET",
      "AVAX",
      "XLM",
      "BCH"
    ];

    // map only those available in selectedCurrencies
    const coins = topCoins
      .filter((symbol) => symbols.includes(symbol))
      .map((symbol) => ({
        symbol,
        name:
          symbol === "BTC" ? "Bitcoin" :
          symbol === "ETH" ? "Ethereum" :
          symbol === "USDTTRC20" ? "Tether TRC20" :
          symbol === "SOL" ? "Solana" :
          symbol === "BNBMAINNET" ? "BNB" :
          symbol === "XRP" ? "Ripple" :
          symbol === "ADA" ? "Cardano" :
          symbol === "DOGECOIN" ? "Dogecoin" :
          symbol === "TRX" ? "Tron" :
          symbol === "LTC" ? "Litecoin" :
          symbol === "DOT" ? "Polkadot" :
          symbol === "MATICMAINNET" ? "Polygon" :
          symbol === "AVAX" ? "Avalanche" :
          symbol === "XLM" ? "Stellar" :
          symbol === "BCH" ? "Bitcoin Cash" :
          symbol,
        network:
          symbol === "USDTTRC20" ? "TRON" :
          symbol === "BNBMAINNET" ? "Binance Smart Chain" :
          symbol === "SOL" ? "Solana" :
          symbol === "MATICMAINNET" ? "Polygon" :
          symbol === "AVAX" ? "Avalanche" :
          symbol === "DOT" ? "Polkadot" :
          symbol === "ADA" ? "Cardano" :
          symbol === "XLM" ? "Stellar" :
          symbol === "XRP" ? "XRP Ledger" :
          symbol === "DOGECOIN" ? "Dogecoin" :
          symbol === "TRX" ? "TRON" :
          symbol === "LTC" ? "Litecoin" :
          symbol === "BCH" ? "Bitcoin Cash" :
          symbol === "ETH" ? "Ethereum" :
          symbol === "BTC" ? "Bitcoin" :
          "Unknown"
      }));

    res.json(coins);
  } catch (e) {
    console.error("❌ getCoins error:", e.response?.data || e.message);
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

// async function getBalance(req, res) {
//   const { userId } = req.params;
//   try {
//     const balances = await svc.getBalance(userId);
//     res.json({ userId, balances });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// }

async function getBalance(req, res) {
  const { userId } = req.params;
  try {
    const balances = await svc.getBalance(userId);
    const symbols = balances.map(b => b.currency.toUpperCase());
    const rates = await getUsdRates(symbols);

    const enriched = balances.map(b => ({
      currency: b.currency.toUpperCase(),
      amount: b.amount,
      usdValue: Number((b.amount * (rates[b.currency.toUpperCase()] || 0)).toFixed(2))
    }));

    const totalUsd = enriched.reduce((sum, b) => sum + b.usdValue, 0);

    res.json({ userId, balances: enriched, totalUsd });
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

async function requestWithdrawOTP(req, res) {
  const { userId } = req.params;
  const { currency, amount, address } = req.body;
  if (!currency || !amount || !address)
    return res.status(400).json({ error: 'currency, amount, address required' });

  try {
    // ✅ Create full pending transaction
    const tx = await Transaction.create({
      userId,
      type: 'withdraw',
      currency: currency.toLowerCase(),
      amount: Number(amount),
      status: 'pending',
      metadata: { address },
    });

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pendingOtps.set(tx._id.toString(), otp);

    // ✅ Send OTP to user's email
    const user = await User.findById(userId).select('email');
    if (!user?.email)
      return res.status(400).json({ error: 'User has no email' });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Withdrawal OTP Verification',
      text: `Your OTP for withdrawing ${amount} ${currency.toUpperCase()} is ${otp}. It will expire in 5 minutes.`,
    });

    // ✅ auto-expire OTP
    setTimeout(() => pendingOtps.delete(tx._id.toString()), 5 * 60 * 1000);

    console.log('✅ Withdrawal created:', tx);
    console.log('✅ OTP for', user.email, '=', otp);

    res.json({ message: 'OTP sent to registered email', requestId: tx._id });
  } catch (e) {
    console.error('❌ Withdraw error:', e);
    res.status(500).json({ error: e.message });
  }
}

// Verify OTP & Execute Withdraw
async function verifyWithdrawOtp(req, res) {
  const { requestId, otp } = req.body;
  if (!requestId || !otp)
    return res.status(400).json({ error: 'requestId and otp required' });

  try {
    const storedOtp = pendingOtps.get(requestId);
    console.log('🔍 Stored OTP:', storedOtp);

    if (!storedOtp) return res.status(400).json({ error: 'OTP expired or invalid' });
    if (storedOtp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

    const tx = await Transaction.findById(requestId);
    console.log('🔍 Found transaction:', tx);

    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.status !== 'pending') return res.status(400).json({ error: 'Invalid transaction' });

    // ✅ simulate deduction
    await svc.debitBalance(tx.userId, tx.currency, tx.amount);

    tx.status = 'finished';
    tx.txHash = 'local-withdraw-' + Date.now();
    await tx.save();

    pendingOtps.delete(requestId);
    res.json({ message: 'Withdrawal successful', tx });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}


module.exports = { getCoins, getDepositAddress, getBalance, getTransactions, requestWithdraw, executeWithdraw, requestWithdrawOTP, verifyWithdrawOtp };
