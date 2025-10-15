const crypto = require("crypto");

exports.verifySlotHmac = (req, res, next) => {
    if (!process.env.SLOTEGRATOR_MERCHANT_KEY) {
    console.warn("⚠️  Skipping HMAC check — no merchant key configured.");
    return next();
  }
  
  const merchantKey = process.env.SLOTEGRATOR_MERCHANT_KEY;
  const { ["x-sign"]: sign, ["x-timestamp"]: ts } = req.headers;

  if (!sign || !ts)
    return res
      .status(200)
      .json({
        error_code: "INTERNAL_ERROR",
        error_description: "missing headers",
      });

  if (Math.abs(Date.now() - Number(ts)) > 30000)
    return res
      .status(200)
      .json({ error_code: "INTERNAL_ERROR", error_description: "expired" });

  const sorted = Object.keys(req.body)
    .sort()
    .map((k) => `${k}=${req.body[k]}`)
    .join("&");
  const expected = crypto
    .createHmac("sha1", merchantKey)
    .update(sorted)
    .digest("hex");

  if (expected !== sign)
    return res
      .status(200)
      .json({ error_code: "INTERNAL_ERROR", error_description: "bad sign" });

  next();
};
