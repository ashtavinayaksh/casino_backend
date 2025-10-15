const crypto = require('crypto');

/**
 * Middleware: Verify NOWPayments IPN HMAC signature.
 * - In production → Enforces validation
 * - In development/test → Bypasses check for local simulation
 */
function verifyNowpSignature(ipnSecret) {
  return (req, res, next) => {
    // ✅ Auto-bypass when in development/test mode
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[WARN] Skipping NOWPayments signature verification (dev mode)');
      return next();
    }

    const sig = req.header('x-nowpayments-sig');
    if (!sig)
      return res.status(401).json({ error: 'Missing NOWPayments signature' });

    const raw = req.rawBody || JSON.stringify(req.body);
    const computed = crypto
      .createHmac('sha512', ipnSecret)
      .update(raw)
      .digest('hex');

    if (computed.toLowerCase() !== sig.toLowerCase()) {
      console.error('Invalid NOWPayments signature');
      return res.status(401).json({ error: 'Invalid NOWPayments signature' });
    }

    next();
  };
}

module.exports = { verifyNowpSignature };









// const crypto = require('crypto');

// /**
//  * Verifies NOWPayments IPN HMAC-SHA512 signature.
//  * Header: x-nowpayments-sig
//  * Body: raw JSON string (exact bytes)
//  */
// function verifyNowpSignature(ipnSecret) {
//   return (req, res, next) => {
//     const sig = req.header('x-nowpayments-sig');
//     if(!sig) return res.status(401).json({ error: 'Missing NOWPayments signature' });

//     const raw = req.rawBody || JSON.stringify(req.body);
//     const h = crypto.createHmac('sha512', ipnSecret).update(raw).digest('hex');
//     if (h.toLowerCase() !== sig.toLowerCase()) {
//       return res.status(401).json({ error: 'Invalid NOWPayments signature' });
//     }
//     next();
//   };
// }

// module.exports = { verifyNowpSignature };
