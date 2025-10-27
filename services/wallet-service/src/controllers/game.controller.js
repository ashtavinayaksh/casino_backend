const crypto = require("crypto");
const gameService = require("../services/game.service");
const { handleBet, handleWin, handleRefund, handleRollback, getUserBalance } = require("../services/callbackHandlers");

const MERCHANT_KEY = process.env.SLOTEGRATOR_MERCHANT_KEY;

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
    if (!uuid || !player_id || !currency ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: game_uuid, player_id, currency, or session_id",
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
    console.error("❌ Error initializing game:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data?.message || err.message || "Internal Server Error",
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
    console.error("❌ Error initializing demo game:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data?.message || err.message,
    });
  }
};



/**
 * Verify X-Sign exactly the same way as Slotgrator & simulateCallbacks.js
 */
function verifySignature(req) {
  const headers = {
    "X-Merchant-Id": req.headers["x-merchant-id"],
    "X-Nonce": req.headers["x-nonce"],
    "X-Timestamp": req.headers["x-timestamp"],
    "X-Sign": req.headers["x-sign"],
  };

  // merge body + headers for signing
  const combined = {
    ...req.body,
    "X-Merchant-Id": headers["X-Merchant-Id"],
    "X-Nonce": headers["X-Nonce"],
    "X-Timestamp": headers["X-Timestamp"],
  };

  // sort all keys alphabetically
  const sortedKeys = Object.keys(combined).sort();
  const query = sortedKeys.map(k => `${k}=${combined[k]}`).join("&");

  const calcSign = crypto.createHmac("sha1", MERCHANT_KEY)
    .update(query)
    .digest("hex");

  const valid = calcSign === headers["X-Sign"];

  if (!valid) {
    console.error("❌ Invalid signature!\nExpected:", calcSign, "\nReceived:", headers["X-Sign"]);
    console.error("🔹 String used to sign:", query);
  }

  return valid;
}

exports.callbackHandler = async (req, res) => {
  try {
    if (!verifySignature(req)) {
      return res.status(403).json({ error_code: "INVALID_SIGNATURE" });
    }

    const { action } = req.body;
    console.log("🎯 Callback received:", action);

    switch (action) {
      case "balance":
        return res.json({ balance: await getUserBalance(req.body.player_id, req.body.currency) });
      case "bet":
        return res.json(await handleBet(req.body));
      case "win":
        return res.json(await handleWin(req.body));
      case "refund":
        return res.json(await handleRefund(req.body));
      case "rollback":
        return res.json(await handleRollback(req.body));
      default:
        return res.json({ error_code: "UNKNOWN_ACTION" });
    }
  } catch (err) {
    console.error("❌ Callback Handler Error:", err.message);
    res.status(500).json({ error_code: "INTERNAL_ERROR", message: err.message });
  }
};

