const crypto = require('crypto');
function verifyHMAC(secret, payloadString, signature) {
  if(!signature) return false;
  const expected = crypto.createHmac('sha1', secret).update(payloadString).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch(e) { return false; }
}
module.exports = { verifyHMAC };
