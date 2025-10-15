const axios = require('axios');

// Uses CoinGecko for free, no API key needed
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

const symbolMap = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  usdt: 'tether',
  bnb: 'binancecoin',
  xrp: 'ripple',
  ada: 'cardano',
  dogecoin: 'dogecoin',
  trx: 'tron',
  ltc: 'litecoin',
  dot: 'polkadot',
  matic: 'polygon',
  avax: 'avalanche-2',
  xlm: 'stellar',
  bch: 'bitcoin-cash'
};

async function getUsdRates(symbols = []) {
  try {
    const ids = symbols
      .map(s => symbolMap[s.toLowerCase()])
      .filter(Boolean)
      .join(',');

    if (!ids) return {};

    const { data } = await axios.get(`${COINGECKO_API}?ids=${ids}&vs_currencies=usd`);
    // Convert back to symbol: rate map
    const rates = {};
    for (const [id, val] of Object.entries(data)) {
      const sym = Object.keys(symbolMap).find(k => symbolMap[k] === id);
      if (sym) rates[sym.toUpperCase()] = val.usd;
    }
    return rates;
  } catch (e) {
    console.error('❌ getUsdRates error:', e.message);
    return {};
  }
}

module.exports = { getUsdRates };
