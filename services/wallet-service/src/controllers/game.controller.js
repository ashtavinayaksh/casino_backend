const crypto = require("crypto");
const GameTransaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const gameService = require("../services/game.service");
const {
  handleBet,
  handleWin,
  handleRefund,
  handleRollback,
  getUserBalance,
} = require("../services/callbackHandlers");
const verifyCallbackSignature = require("../utils/verifyCallbackSignature");

const UPPER = (c) => (c || "").toString().trim().toUpperCase();
const LOWER = (c) => UPPER(c).toLowerCase();

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

