const crypto = require("crypto");

const MERCHANT_ID = process.env.SLOTEGRATOR_MERCHANT_ID;
const MERCHANT_KEY = process.env.SLOTEGRATOR_MERCHANT_KEY;

/**
 * Generate HMAC-SHA1 signature for Slotegrator API.
 * @param {Object} params - Request params (will be sorted alphabetically)
 * @param {string} merchantKey - Your Slotegrator Merchant Key
 * @returns {string} signature hex string
 */
function signParams(params, merchantKey) {
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHmac("sha1", merchantKey).update(queryString).digest("hex");
}

function generateHeaders() {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.random().toString(36).slice(2, 14);

  const dataToSign = `X-Merchant-Id=${MERCHANT_ID}&X-Nonce=${nonce}&X-Timestamp=${timestamp}`;
  const xSign = crypto.createHmac("sha1", MERCHANT_KEY).update(dataToSign).digest("hex");

  return {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Merchant-Id": MERCHANT_ID,
      "X-Nonce": nonce,
      "X-Timestamp": timestamp,
      "X-Sign": xSign,
    },
  };
}

/**
 * Generate a secure, unique session_id for Slotgrator sessions.
 * Combines player_id, timestamp, and a short random hash.
 */
function generateSessionId(player_id) {
  const timestamp = Math.floor(Date.now() / 1000);
  const randomHash = crypto.randomBytes(4).toString("hex"); // 8-char random
  return `sess_${player_id}_${timestamp}_${randomHash}`;
}

module.exports = { signParams, generateHeaders, generateSessionId };
