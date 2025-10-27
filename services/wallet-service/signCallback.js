// signCallback.js
const crypto = require("crypto");

const MERCHANT_KEY = "23d43f20b489421a5e802ee58f32f2db6c10b516"; // same as in your .env
const MERCHANT_ID = "d81db2e9c9b7a35ddf0db4c2f1c3d288";

const body = {
  action: "bet",
  player_id: "68eb94c22a7983ea19b0bd6a",
  amount: 10,
  currency: "USD",
  transaction_id: "T12345",
  game_uuid: "447eebaff41fdc9c36cf680720ea2ce321d33b67"
};

const nonce = Math.random().toString(36).substring(2, 14);
const timestamp = Math.floor(Date.now() / 1000);

const payload = { ...body, "X-Merchant-Id": MERCHANT_ID, "X-Nonce": nonce, "X-Timestamp": timestamp };
const sortedKeys = Object.keys(payload).sort();
const query = sortedKeys.map(k => `${k}=${payload[k]}`).join("&");
const sign = crypto.createHmac("sha1", MERCHANT_KEY).update(query).digest("hex");

console.log({ nonce, timestamp, sign });
