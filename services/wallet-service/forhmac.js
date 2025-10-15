const crypto = require("crypto");

const secret = "YyzKnnqJ1nmPb0IwB0BJ0p//g/CRIAtU";
const raw = '{"payment_id":4401335868,"payment_status":"confirmed","actually_paid":0.05089939,"pay_currency":"sol","order_id":"68eb94c22a7983ea19b0bd6a"}';

const sig = crypto.createHmac("sha512", secret).update(raw).digest("hex");
console.log("x-nowpayments-sig:", sig);
