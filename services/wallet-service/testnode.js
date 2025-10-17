/**
 * testnode.js — Full test client for Slotgrator /games/init-demo
 * Usage:
 *   npm install axios
 *   node testnode.js
 */

const axios = require("axios");
const crypto = require("crypto");

// ===== CONFIG =====
const API_URL = "https://staging.slotegrator.com/api/index.php/v1/games/init-demo";
const MERCHANT_ID = "d81db2e9c9b7a35ddf0db4c2f1c3d288";
const MERCHANT_KEY = "23d43f20b489421a5e802ee58f32f2db6c10b516";

const game_uuid = "7487f0fac9049c9ee0dd0635a8ce5f5bfe04cd15";
// ===================

(async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.random().toString(36).substring(2, 14);

  // Build request parameters
  const requestParams = {
    game_uuid,
    device: "desktop",
    language: "en",
    return_url: "https://unintermitting-carley-excursively.ngrok-free.dev",
  };

  // Merge headers + params for signature
  const headersParams = {
    "X-Merchant-Id": MERCHANT_ID,
    "X-Nonce": nonce,
    "X-Timestamp": timestamp,
  };

  const allParams = { ...requestParams, ...headersParams };

  // Sort by key alphabetically (required)
  const sortedKeys = Object.keys(allParams).sort();
  const sortedObject = {};
  sortedKeys.forEach((key) => (sortedObject[key] = allParams[key]));

  // Build the query string and sign it
  const queryString = new URLSearchParams(sortedObject).toString();
  const xSign = crypto.createHmac("sha1", MERCHANT_KEY).update(queryString).digest("hex");

  console.log("🔹 Sorted String to Sign:\n", queryString);
  console.log("🔹 X-Sign:", xSign);

  // Prepare headers
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Merchant-Id": MERCHANT_ID,
    "X-Nonce": nonce,
    "X-Timestamp": timestamp,
    "X-Sign": xSign,
  };

  const payload = new URLSearchParams(requestParams);

  try {
    console.log("\n📤 Sending POST to:", API_URL);
    const res = await axios.post(API_URL, payload, { headers });
    console.log("\n✅ Response:", res.status, res.data);
  } catch (err) {
    console.error("\n❌ Status:", err.response?.status);
    console.error("❌ Data:", err.response?.data || err.message);
  }
})();
