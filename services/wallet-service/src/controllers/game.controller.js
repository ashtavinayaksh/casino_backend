const crypto = require("crypto");
const GameTransaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const gameService = require("../services/game.service");
const { getUsdRates } = require("../lib/price");
const {
  handleBet,
  handleWin,
  handleRefund,
  handleRollback,
  getUserBalance,
} = require("../services/callbackHandlers");
const verifyCallbackSignature = require("../utils/verifyCallbackSignature");
const axios = require("axios");

const UPPER = (c) => (c || "").toString().trim().toUpperCase();
const LOWER = (c) => UPPER(c).toLowerCase();

// Helper: detect crypto
const CRYPTOS = ["BTC","ETH","SOL","USDT","BNB","XRP","ADA","DOGE","TRX","LTC","DOT","MATIC","AVAX","XLM","BCH"];
const isCrypto = (sym) => CRYPTOS.includes(UPPER(sym));

const MERCHANT_KEY = process.env.SLOTEGRATOR_MERCHANT_KEY;
const DEFAULT_CURRENCY = (process.env.DEFAULT_CURRENCY || "USD").toUpperCase();
const normalizeCurrency = (c) => (c || DEFAULT_CURRENCY).toString().trim().toUpperCase();

exports.getGames = async (req, res) => {
  try {
    const games = await gameService.listGames();
    // console.log("games are:", games)
    res.json({ games });
  } catch (err) {
    console.error("❌ Error fetching games:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.initGame = async (req, res) => {
  try {
    const { uuid } = req.params;
    const {
      player_id,
      currency,
      player_name,
      device,
      return_url,
      language,
      //   session_id,
      email,
    } = req.body;

    // ✅ Validate required fields
    if (!uuid || !player_id || !currency) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: game_uuid, player_id, currency, or session_id",
      });
    }

    console.log("🎮 initGame() controller called");
    console.log("🔹 Game UUID:", uuid);
    console.log("🔹 Player ID:", player_id);
    // console.log("🔹 Session ID:", session_id);
    console.log("🔹 Currency:", currency);

    const result = await gameService.initGame({
      player_id,
      game_uuid: uuid,
      currency,
      player_name,
      device,
      language,
      return_url,
      //   session_id,
      email,
    });

    res.status(200).json({
      success: true,
      message: "Game session initialized successfully",
      data: result,
    });
  } catch (err) {
    console.error(
      "❌ Error initializing game:",
      err.response?.data || err.message
    );
    res.status(500).json({
      success: false,
      error:
        err.response?.data?.message || err.message || "Internal Server Error",
    });
  }
};

exports.initDemoGame = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { device, language, return_url } = req.body;

    const result = await gameService.initDemoGame({
      game_uuid: uuid,
      device,
      language,
      return_url,
    });

    res.status(200).json({
      success: true,
      message: "Demo game session initialized successfully",
      data: result,
    });
  } catch (err) {
    console.error(
      "❌ Error initializing demo game:",
      err.response?.data || err.message
    );
    res.status(500).json({
      success: false,
      error: err.response?.data?.message || err.message,
    });
  }
};

exports.setGameCurrency = async (req, res) => {
  try {
    const { userId } = req.params;
    let { currency } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: "userId required" });
    if (!currency) return res.status(400).json({ success: false, message: "currency required" });

    currency = UPPER(currency);
    const curLower = LOWER(currency);

    // upsert wallet + set gameCurrency (UPPERCASE)
    let wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $set: { gameCurrency: currency } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // ensure a balance row exists for the chosen currency (lowercase)
    if (!wallet.balances.some(b => (b.currency || "") === curLower)) {
      wallet.balances.push({ currency: curLower, amount: 0, locked: 0 });
      await wallet.save();
    }

    return res.json({
      success: true,
      message: "Game currency updated",
      data: {
        userId: wallet.userId,
        gameCurrency: wallet.gameCurrency,
        balances: wallet.balances,
      },
    });
  } catch (err) {
    console.error("❌ setGameCurrency error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * Convert user's preferredCurrency (from Wallet)
 * to gameCurrency (target) using live or cached rates.
 * Updates wallet betCurrency and balance values accordingly.
 */
exports.convertToGameCurrency = async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferredCurrency, gameCurrency } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: "userId required" });
    if (!preferredCurrency || !gameCurrency)
      return res.status(400).json({ success: false, message: "preferredCurrency & gameCurrency required" });

    const fromCur = UPPER(preferredCurrency);
    const toCur = UPPER(gameCurrency);

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

    // Get user's amount in the source currency
    const fromEntry = wallet.balances.find((b) => UPPER(b.currency) === fromCur);
    const fromAmount = fromEntry ? Number(fromEntry.amount || 0) : 0;

    if (fromAmount <= 0)
      return res.status(400).json({ success: false, message: `No balance in ${fromCur}` });

    // === Calculate conversion rate ===
    let rate = 1;

    if (isCrypto(fromCur) && isCrypto(toCur)) {
      // crypto → crypto (via USD bridge)
      const usdRates = await getUsdRates([fromCur, toCur]);
      const fromUsd = usdRates[fromCur];
      const toUsd = usdRates[toCur];
      rate = fromUsd / toUsd;
    } else if (isCrypto(fromCur) && !isCrypto(toCur)) {
      // crypto → fiat
      const usdRates = await getUsdRates([fromCur]);
      const cryptoUsd = usdRates[fromCur];
      const fxRes = await axios.get("https://open.er-api.com/v6/latest/USD");
      const usdRatesFx = fxRes.data?.rates || {};
      const usdToTarget = usdRatesFx[toCur] || 1;
      rate = cryptoUsd * usdToTarget;
    } else if (!isCrypto(fromCur) && isCrypto(toCur)) {
      // fiat → crypto
      const fxRes = await axios.get(`https://open.er-api.com/v6/latest/${fromCur}`);
      const fxRates = fxRes.data?.rates || {};
      const fiatToUsd = fxRates["USD"] ? 1 / fxRates["USD"] : 1; // if base not USD
      const usdRates = await getUsdRates([toCur]);
      const usdToCrypto = 1 / usdRates[toCur];
      rate = fiatToUsd * usdToCrypto;
    } else {
      // fiat → fiat
      const fxRes = await axios.get(`https://open.er-api.com/v6/latest/${fromCur}`);
      const rates = fxRes.data?.rates || {};
      rate = rates[toCur] || 1;
    }

    if (!rate || rate <= 0) {
      console.warn(`⚠️ Missing exchange rate for ${fromCur} → ${toCur}. Using 1.`);
      rate = 1;
    }

    // === Perform conversion ===
    const convertedAmount = Number((fromAmount * rate).toFixed(2));

    // update or insert target currency balance
    let toEntry = wallet.balances.find((b) => UPPER(b.currency) === toCur);
    if (!toEntry) {
      wallet.balances.push({ currency: LOWER(toCur), amount: convertedAmount, locked: 0 });
    } else {
      toEntry.amount = convertedAmount;
    }

    wallet.betCurrency = toCur;
    wallet.preferredCurrency = fromCur;
    await wallet.save();

    return res.json({
      success: true,
      message: `Converted ${fromAmount} ${fromCur} → ${convertedAmount} ${toCur}`,
      data: {
        userId: wallet.userId,
        preferredCurrency: fromCur,
        betCurrency: toCur,
        rate,
        balances: wallet.balances,
      },
    });
  } catch (err) {
    console.error("❌ convertToGameCurrency error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.callbackHandler = async (req, res) => {
  console.log("🚦 /api/games/callback HIT");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  try {
    const isValid = verifyCallbackSignature(req, MERCHANT_KEY);
    console.log("Signature valid?", isValid);

    if (!isValid) {
      console.log("❌ Invalid signature - sending 403");
      return res.status(403).json({ error_code: "INVALID_SIGNATURE" });
    }

    const action = (req.body.action || "").toLowerCase();
    const currency = (req.body.currency || DEFAULT_CURRENCY).toUpperCase();
    console.log("🎯 Callback received:", action, "| Currency:", currency);

    switch (action) {
      case "balance": {
        const { player_id } = req.body;
        const bal = await getUserBalance(player_id, currency);
        console.log(`✅ Returning ${currency} balance:`, bal);
        return res.json({ balance: Number(bal.toFixed(2)), currency });
      }

      case "bet":
        return res.json(await handleBet(req.body));

      case "win":
        return res.json(await handleWin(req.body));

      case "refund":
        return res.json(await handleRefund(req.body));

      case "rollback":
        return res.json(await handleRollback(req.body));

      default:
        console.log("❌ Unknown action:", action);
        return res.json({ error_code: "UNKNOWN_ACTION" });
    }
  } catch (err) {
    console.error("❌ Callback Handler Error:", err);
    return res
      .status(500)
      .json({ error_code: "INTERNAL_ERROR", message: err.message });
  }
};


// ==========================================================
// 🧾 1️⃣ All Bets (with game name)
// ==========================================================
exports.getAllBets = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // 1️⃣ Get all games to map UUID → name
    const gameData = await gameService.listGames();
    const uuidToName = {};
    if (gameData?.games?.items?.length) {
      for (const g of gameData.games.items) {
        uuidToName[g.uuid] = g.name;
      }
    }

    // 2️⃣ Fetch bet-related transactions
    const bets = await GameTransaction.find({
      type: { $in: ["bet", "win", "refund", "rollback"] },
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    // 3️⃣ Format output
    const formatted = bets.map((b) => ({
      game: uuidToName[b.game_uuid] || "Unknown Game",
      user: `Player***${b.userId?.slice(-3) || "XXX"}`,
      betAmount: `${b.amount?.toFixed(2)} ${b.currency?.toUpperCase()}`,
      multiplier: b.metadata?.multiplier
        ? `${b.metadata.multiplier.toFixed(2)}x`
        : null,
      payout:
        b.type === "win"
          ? `+${b.amount?.toFixed(2)} ${b.currency?.toUpperCase()}`
          : b.type === "bet"
          ? `-${b.amount?.toFixed(2)} ${b.currency?.toUpperCase()}`
          : b.type === "refund" || b.type === "rollback"
          ? `+${b.amount?.toFixed(2)} ${b.currency?.toUpperCase()}`
          : "0",
      color:
        b.type === "win" || b.type === "refund" || b.type === "rollback"
          ? "green"
          : "red",
      time: "Just now",
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error("❌ getAllBets Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================================
// 🧾 2️⃣ Bets for specific user (with game name)
// ==========================================================
exports.getUserBets = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const gameData = await gameService.listGames();
    const uuidToName = {};
    if (gameData?.games?.items?.length) {
      for (const g of gameData.games.items) {
        uuidToName[g.uuid] = g.name;
      }
    }

    const bets = await GameTransaction.find({
      userId,
      type: { $in: ["bet", "win", "refund", "rollback"] },
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const formatted = bets.map((b) => ({
      game: uuidToName[b.game_uuid] || "Unknown Game",
      type: b.type,
      amount: `${b.amount?.toFixed(2)} ${b.currency?.toUpperCase()}`,
      balanceAfter: b.balance_after || 0,
      payout:
        b.type === "win"
          ? `+${b.amount?.toFixed(2)} ${b.currency?.toUpperCase()}`
          : b.type === "bet"
          ? `-${b.amount?.toFixed(2)} ${b.currency?.toUpperCase()}`
          : b.type === "refund" || b.type === "rollback"
          ? `+${b.amount?.toFixed(2)} ${b.currency?.toUpperCase()}`
          : "0",
      createdAt: b.createdAt,
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error("❌ getUserBets Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================================
// 🏆 3️⃣ Recent Wins (last N transactions)
// ==========================================================
exports.getRecentWins = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Fetch latest "win" transactions
    const recentWins = await GameTransaction.find({ type: "win" })
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    // Map UUID → Game Name
    const gameData = await gameService.listGames();
    const uuidToName = {};
    if (gameData?.games?.items?.length) {
      for (const g of gameData.games.items) {
        uuidToName[g.uuid] = g.name;
      }
    }

    // Format the response
    const formatted = recentWins.map((tx) => ({
      game: uuidToName[tx.game_uuid] || "Unknown Game",
      user: `Player***${tx.userId?.slice(-3) || "XXX"}`,
      amount: `${tx.amount?.toFixed(2)} ${tx.currency?.toUpperCase()}`,
      balanceAfter: tx.balance_after || 0,
      timeAgo: timeAgo(tx.createdAt),
      color: "green",
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    console.error("❌ getRecentWins Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper function to format time
function timeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}
