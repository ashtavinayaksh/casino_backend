// src/utils/verifyCallbackSignature.js
const crypto = require("crypto");

function verifyCallbackSignature(req, merchantKey) {
  try {
    const merchantId = req.headers["x-merchant-id"];
    const nonce = req.headers["x-nonce"];
    const timestamp = req.headers["x-timestamp"];
    const receivedSign = req.headers["x-sign"];

    // combine for signing
    const combined = {
      ...req.body,
      "X-Merchant-Id": merchantId,
      "X-Nonce": nonce,
      "X-Timestamp": timestamp,
    };

    // sort keys alphabetically
    const sortedKeys = Object.keys(combined).sort();
    const query = sortedKeys.map(k => `${k}=${combined[k]}`).join("&");

    // compute sign
    const calcSign = crypto.createHmac("sha1", merchantKey)
      .update(query)
      .digest("hex");

    const valid = calcSign === receivedSign;

    if (!valid) {
      console.error("❌ Invalid signature!");
      console.error("Expected:", calcSign);
      console.error("Received:", receivedSign);
      console.error("🔹 String used to sign:", query);
    } else {
      console.log("✅ Signature verified successfully");
    }

    return valid;
  } catch (err) {
    console.error("❌ Signature verification error:", err.message);
    return false;
  }
}

module.exports = verifyCallbackSignature;
