const crypto = require("crypto");

function verifyCallbackSignature(req, merchantKey) {
  const headers = {
    "X-Merchant-Id": req.headers["x-merchant-id"],
    "X-Timestamp": req.headers["x-timestamp"],
    "X-Nonce": req.headers["x-nonce"],
  };
  const receivedSign = req.headers["x-sign"];

  console.log("headers for verifySign:", headers);

  const merged = { ...req.body, ...headers };
  const sorted = Object.keys(merged)
    .sort()
    .reduce((obj, key) => ({ ...obj, [key]: merged[key] }), {});
  const query = new URLSearchParams(sorted).toString();

  const expected = crypto.createHmac("sha1", merchantKey).update(query).digest("hex");

  if (expected !== receivedSign) {
    console.log("❌ Invalid signature!");
    console.log("Expected:", expected);
    console.log("Received:", receivedSign);
    console.log("🔹 String used to sign:", query);
    return false;
  }
  return true;
}

module.exports = verifyCallbackSignature;
