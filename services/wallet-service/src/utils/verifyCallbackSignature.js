const crypto = require("crypto");

function verifyCallbackSignature(req, merchantKey) {
  const headers = {
    "X-Merchant-Id": req.header("X-Merchant-Id"),
    "X-Timestamp": req.header("X-Timestamp"),
    "X-Nonce": req.header("X-Nonce"),
  };
  const receivedSign = req.header("X-Sign");
  console.log("headers for verifySign:", headers);

  const merged = { ...req.body, ...headers };
  const sorted = Object.keys(merged)
    .sort()
    .reduce((obj, key) => ({ ...obj, [key]: merged[key] }), {});
  const query = new URLSearchParams(sorted).toString();

  const expected = crypto.createHmac("sha1", merchantKey).update(query).digest("hex");

  if (expected !== receivedSign) {
    console.error("❌ Invalid signature!");
    console.log("Expected:", expected);
    console.log("Received:", receivedSign);
    console.log("🔹 String used to sign:", query);
    return false;
  }
  console.log("headers for verifySign:", headers);
  return true;
}

module.exports = verifyCallbackSignature;
