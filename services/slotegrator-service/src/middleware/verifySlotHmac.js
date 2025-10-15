const crypto = require('crypto');

exports.verifySlotHmac = (req, res, next) => {
  const merchantKey = process.env.SLOTEGRATOR_MERCHANT_KEY;
  const sign = req.headers['x-sign'];
  if (!sign) return res.status(200).json({ error_code: "INTERNAL_ERROR", error_description: "Missing signature" });

  const sorted = Object.keys(req.body)
    .sort()
    .map(k => `${k}=${req.body[k]}`)
    .join('&');

  const expected = crypto.createHmac('sha1', merchantKey).update(sorted).digest('hex');
  if (expected !== sign)
    return res.status(200).json({ error_code: "INTERNAL_ERROR", error_description: "Invalid signature" });

  next();
};









// const crypto = require('crypto');

// exports.verifySlotHmac = (req, res, next) => {
//   const merchantKey = process.env.SLOTEGRATOR_MERCHANT_KEY;
//   const { ['x-sign']: sign, ['x-timestamp']: ts, ['x-merchant-id']: id, ['x-nonce']: nonce } = req.headers;

//   // reject expired timestamp
//   if (Math.abs(Date.now() - Number(ts)) > 30000)
//     return res.status(200).json({ error_code: "INTERNAL_ERROR", error_description: "expired" });

//   // Rebuild query string in sorted order
//   const params = new URLSearchParams(req.body);
//   const sorted = [...params.entries()].sort();
//   const queryString = sorted.map(([k, v]) => `${k}=${v}`).join('&');

//   // Compute signature
//   const expectedSign = crypto.createHmac('sha1', merchantKey).update(queryString).digest('hex');

//   if (expectedSign !== sign)
//     return res.status(200).json({ error_code: "INTERNAL_ERROR", error_description: "bad sign" });

//   next();
// };
