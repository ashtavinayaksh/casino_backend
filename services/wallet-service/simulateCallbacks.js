/**
 * simulateCallbacks.js
 * --------------------------------------------------------
 * Simulates all Slotegrator callback types (balance, bet, win, refund, rollback)
 * against your running /api/games/callback endpoint.
 * --------------------------------------------------------
 * Run: node simulateCallbacks.js
 */

const axios = require("axios");
const crypto = require("crypto");

// ====== CONFIG ======
const CALLBACK_URL = "https://mapi.examtree.ai/wallet-service/api/games/callback";
const MERCHANT_ID = "d81db2e9c9b7a35ddf0db4c2f1c3d288";
const MERCHANT_KEY = "23d43f20b489421a5e802ee58f32f2db6c10b516";
const PLAYER_ID = "68eb94c22a7983ea19b0bd6a";
const GAME_UUID = "447eebaff41fdc9c36cf680720ea2ce321d33b67";
const CURRENCY = "USD";
// =====================

/**
 * Generate signed headers for Slotegrator-like callback.
 */
function generateSignedHeaders(body) {
  const nonce = Math.random().toString(36).substring(2, 14);
  const timestamp = Math.floor(Date.now() / 1000);

  // merge body + required headers for signature
  const payload = { ...body, "X-Merchant-Id": MERCHANT_ID, "X-Nonce": nonce, "X-Timestamp": timestamp };

  // sort keys alphabetically
  const sortedKeys = Object.keys(payload).sort();
  const query = sortedKeys.map((k) => `${k}=${payload[k]}`).join("&");

  const sign = crypto.createHmac("sha1", MERCHANT_KEY).update(query).digest("hex");

  return {
    headers: {
      "Content-Type": "application/json",
      "X-Merchant-Id": MERCHANT_ID,
      "X-Nonce": nonce,
      "X-Timestamp": timestamp,
      "X-Sign": sign,
    },
  };
}

/**
 * Send a single callback type and log response
 */
async function sendCallback(action, extra = {}) {
  const body = { action, player_id: PLAYER_ID, currency: CURRENCY, game_uuid: GAME_UUID, ...extra };
  const config = generateSignedHeaders(body);

  console.log("\n🛰️  Sending callback:", action);
  console.log("📦 Body:", body);
  console.log("🧮 Headers:", config.headers);

  try {
    const res = await axios.post(CALLBACK_URL, body, config);
    console.log("✅ Response:", res.status, res.data);
  } catch (err) {
    console.error("❌ Error:", err.response?.status, err.response?.data || err.message);
  }
}

/**
 * Run all tests sequentially
 */
(async () => {
  console.log("🚀 Starting Slotegrator Callback Simulation...");

  await sendCallback("balance");
  await new Promise((r) => setTimeout(r, 1000));

  await sendCallback("bet", { amount: 10, transaction_id: "TXN_BET_001" });
  await new Promise((r) => setTimeout(r, 1000));

  await sendCallback("win", { amount: 25, transaction_id: "TXN_WIN_001" });
  await new Promise((r) => setTimeout(r, 1000));

  await sendCallback("refund", { amount: 10, transaction_id: "TXN_REF_001" });
  await new Promise((r) => setTimeout(r, 1000));

  await sendCallback("rollback", { amount: 15, transaction_id: "TXN_ROLL_001" });

  console.log("\n✅ Simulation Complete.");
})();
