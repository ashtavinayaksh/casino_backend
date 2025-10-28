const axios = require("axios");

// ✅ Use CoinGecko API — free & no API key required
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

// map short symbols to CoinGecko IDs
const symbolMap = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  usdt: "tether",
  bnb: "binancecoin",
  xrp: "ripple",
  ada: "cardano",
  doge: "dogecoin",
  trx: "tron",
  ltc: "litecoin",
  dot: "polkadot",
  matic: "polygon",
  avax: "avalanche-2",
  xlm: "stellar",
  bch: "bitcoin-cash",
  usd: "tether" // fallback for USD mapping
};

// ✅ cache last successful rates to prevent zeros on 429/timeout
let cachedRates = {};
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get USD rates for provided symbols.
 * Gracefully handles CoinGecko rate limiting (429)
 * and uses last cached values if API fails.
 */
async function getUsdRates(symbols = []) {
  try {
    // Filter only valid mapped tokens
    const ids = symbols
      .map((s) => symbolMap[s.toLowerCase()])
      .filter(Boolean)
      .join(",");

    // return cached data if still fresh
    const now = Date.now();
    if (now - lastFetchTime < CACHE_TTL_MS && Object.keys(cachedRates).length > 0) {
      const result = {};
      for (const s of symbols) {
        const sym = s.toUpperCase();
        result[sym] = cachedRates[sym] || 1;
      }
      return result;
    }

    if (!ids) return {};

    const { data } = await axios.get(`${COINGECKO_API}?ids=${ids}&vs_currencies=usd`);
    const rates = {};

    for (const [id, val] of Object.entries(data)) {
      const sym = Object.keys(symbolMap).find((k) => symbolMap[k] === id);
      if (sym) rates[sym.toUpperCase()] = val.usd;
    }

    cachedRates = rates;
    lastFetchTime = now;
    return rates;
  } catch (e) {
    console.error("❌ getUsdRates error:", e.message);
    if (Object.keys(cachedRates).length > 0) {
      console.log("⚙️ Using cached USD rates fallback");
      const result = {};
      for (const s of symbols) {
        result[s.toUpperCase()] = cachedRates[s.toUpperCase()] || 1;
      }
      return result;
    }

    console.log("⚙️ Using flat fallback rates = 1 (as last resort)");
    const result = {};
    for (const s of symbols) result[s.toUpperCase()] = 1;
    return result;
  }
}

module.exports = { getUsdRates };
