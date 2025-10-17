const axios = require("axios");
const crypto = require("crypto");

const API_URL = "https://staging.slotegrator.com/api/index.php/v1/games";

// ⚙️ Replace with your actual credentials
const MERCHANT_ID = "d81db2e9c9b7a35ddf0db4c2f1c3d288";
const MERCHANT_KEY = "23d43f20b489421a5e802ee58f32f2db6c10b516";

(async () => {
  // ✅ Fresh timestamp in SECONDS (not ms)
  const timestamp = Math.floor(Date.now() / 1000);

  // ✅ Unique nonce for every request
  const nonce = Math.random().toString(36).slice(2, 14);

  // ✅ Exact order and field names required by Slotgrator
  const dataToSign = `X-Merchant-Id=${MERCHANT_ID}&X-Nonce=${nonce}&X-Timestamp=${timestamp}`;

  // ✅ HMAC-SHA1 signature
  const xSign = crypto.createHmac("sha1", MERCHANT_KEY).update(dataToSign).digest("hex");

  console.log("🔹 Timestamp:", timestamp);
  console.log("🔹 Nonce:", nonce);
  console.log("🔹 String to sign:", dataToSign);
  console.log("🔹 X-Sign:", xSign);

  try {
    // ✅ Send GET request with headers only (no query params)
    const res = await axios.get(API_URL, {
      headers: {
        "X-Merchant-Id": MERCHANT_ID,
        "X-Nonce": nonce,
        "X-Timestamp": timestamp,
        "X-Sign": xSign,
      },
    });

    console.log("✅ HTTP", res.status);
    console.log("✅ Response:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("❌ HTTP", err.response?.status);
    console.error("❌ Body:", err.response?.data || err.message);
  }
})();
