const axios = require("axios");
const crypto = require("crypto");
const { generateHeaders, generateSessionId } = require("../utils/hmacSigner");

const API_URL = process.env.SLOTEGRATOR_API_URL || "https://staging.slotegrator.com/api/index.php/v1";
const MERCHANT_ID = process.env.SLOTEGRATOR_MERCHANT_ID || "d81db2e9c9b7a35ddf0db4c2f1c3d288";
const MERCHANT_KEY = process.env.SLOTEGRATOR_MERCHANT_KEY || "23d43f20b489421a5e802ee58f32f2db6c10b516";

console.log("env data are:", API_URL, MERCHANT_ID, MERCHANT_KEY);

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 8000, // 8 seconds max wait
});


/**
 * Generate signature headers for Slotgrator API requests.
 */
// function generateHeaders() {
//   const timestamp = Math.floor(Date.now() / 1000);
//   const nonce = Math.random().toString(36).slice(2, 14);
//   const dataToSign = `X-Merchant-Id=${MERCHANT_ID}&X-Nonce=${nonce}&X-Timestamp=${timestamp}`;
//   const xSign = crypto.createHmac("sha1", MERCHANT_KEY).update(dataToSign).digest("hex");

//   return {
//     headers: {
//       "X-Merchant-Id": MERCHANT_ID,
//       "X-Nonce": nonce,
//       "X-Timestamp": timestamp,
//       "X-Sign": xSign,
//       "Content-Type": "application/x-www-form-urlencoded",
//     },
//   };
// }

/**
 * Fetch available games from Slotegrator.
 */
async function listGames() {
  try {
    const endpoint = `${API_URL}/games`;
    const { headers } = generateHeaders();

    console.log("🧩 Slotgrator listGames() request");
    console.log("🔹 Endpoint:", endpoint);
    console.log("🔹 Headers:", headers);

    const res = await axios.get(endpoint, { headers });
    console.log("✅ /games Response:", res.status);
    return res.data;
  } catch (err) {
    console.error("❌ listGames() Error:", err.response?.status, err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Slotgrator API error");
  }
}


/**
 * Initialize a real game session with Slotgrator
 * Required: player_id, game_uuid, currency
 * Auto-generates session_id if not provided
 */
async function initGame({
  player_id,
  game_uuid,
  currency,
  player_name,
  device,
  language,
  return_url,
  session_id,
  email,
}) {
  const endpoint = `${API_URL}/games/init`;

  // ✅ Generate session_id automatically if not provided
  const finalSessionId = session_id || generateSessionId(player_id);

  // 🧩 Request parameters
  const requestParams = {
    player_id,
    game_uuid,
    currency,
    session_id: finalSessionId,
    player_name: player_name || "Guest",
    email: email || "",
    device: device || "desktop",
    language: language || "en",
    return_url: return_url || "https://yourdomain.com/game-return",
  };

  // 🕒 Timestamp + Nonce
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.random().toString(36).substring(2, 14);

  // 🧠 Headers for signature
  const headersParams = {
    "X-Merchant-Id": MERCHANT_ID,
    "X-Nonce": nonce,
    "X-Timestamp": timestamp,
  };

  // ✅ Merge + sort all params alphabetically
  const allParams = { ...requestParams, ...headersParams };
  const sortedKeys = Object.keys(allParams).sort();
  const sortedObject = {};
  sortedKeys.forEach((key) => (sortedObject[key] = allParams[key]));

  // ✅ Signature
  const queryString = new URLSearchParams(sortedObject).toString();
  const xSign = crypto.createHmac("sha1", MERCHANT_KEY).update(queryString).digest("hex");

  console.log("🎮 initGame() request:", endpoint);
  console.log("🔹 String to sign:", queryString);
  console.log("🔹 X-Sign:", xSign);
  console.log("🔹 Session ID:", finalSessionId);

  // ✅ Headers
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Merchant-Id": MERCHANT_ID,
    "X-Nonce": nonce,
    "X-Timestamp": timestamp,
    "X-Sign": xSign,
  };

  // ✅ Payload
  const payload = new URLSearchParams(requestParams);

  try {
    const res = await axiosInstance.post(endpoint, payload, { headers });
    console.log("✅ /games/init Response:", res.status, res.data);
    return res.data;
  } catch (err) {
    console.error("❌ initGame() Error:", err.response?.status, err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Slotgrator API error");
  }
}


/**
 * Initialize demo game session.
 */
async function initDemoGame({ game_uuid, device, language, return_url }) {
  const endpoint = `${API_URL}/games/init-demo`;

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.random().toString(36).substring(2, 14);

  // Build request parameters
  const requestParams = {
    game_uuid,
    device: device || "desktop",
    language: language || "en",
    return_url: return_url || "https://yourdomain.com/game-return",
  };

  // Merge headers + params for signature
  const headersParams = {
    "X-Merchant-Id": MERCHANT_ID,
    "X-Nonce": nonce,
    "X-Timestamp": timestamp,
  };

  const allParams = { ...requestParams, ...headersParams };

  // Sort all keys alphabetically
  const sortedKeys = Object.keys(allParams).sort();
  const sortedObject = {};
  sortedKeys.forEach((key) => (sortedObject[key] = allParams[key]));

  // Build query string and signature
  const queryString = new URLSearchParams(sortedObject).toString();
  const xSign = crypto.createHmac("sha1", MERCHANT_KEY).update(queryString).digest("hex");

  console.log("🎮 initDemoGame() request:", endpoint);
  console.log("🔹 Sorted String to Sign:", queryString);
  console.log("🔹 X-Sign:", xSign);

  // Headers
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Merchant-Id": MERCHANT_ID,
    "X-Nonce": nonce,
    "X-Timestamp": timestamp,
    "X-Sign": xSign,
  };

  const payload = new URLSearchParams(requestParams);

  try {
    const res = await axios.post(endpoint, payload, { headers, timeout: 10000 });
    console.log("✅ /games/init-demo Response:", res.status, res.data);
    return res.data;
  } catch (err) {
    console.error("❌ initDemoGame() Error:", err.response?.status, err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Slotgrator API error");
  }
}


module.exports = { listGames, initGame, initDemoGame };
