const svc = require('../services/wallet.service');
const nowp = require('../lib/nowpayments');
const { getUsdRates } = require('../lib/price');

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

module.exports = { getCoins, getDepositAddress, getBalance, getTransactions, requestWithdraw, executeWithdraw };
