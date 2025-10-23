require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const { connectDB } = require("./db/connection");
const {
  cleanCorsHeaders,
  corsMiddleware,
  helmetMiddleware,
  compressionMiddleware,
  sanitizeMiddleware,
  hppMiddleware,
} = require("./middleware/security");

const app = express();

// -------------------------------------------------------------
// ✅ Basic middleware setup (no raw-body trap here)
// -------------------------------------------------------------
app.use(corsMiddleware);
app.use(cleanCorsHeaders);
app.use(helmetMiddleware);
app.use(express.json({ limit: "10mb" }));
app.use(sanitizeMiddleware);
app.use(hppMiddleware);
app.use(compressionMiddleware);
app.use(morgan("dev"));

// -------------------------------------------------------------
// ✅ Debug: log every incoming request (useful for tracing 504s)
// -------------------------------------------------------------
app.use((req, _res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`);
  next();
});

// -------------------------------------------------------------
// ✅ Normal API routes
// -------------------------------------------------------------
app.use("/api/wallet", require("./routes/wallet.routes"));
app.use("/api/slotgrator", require("./routes/slotgrator.routes"));
app.use("/api/games", require("./routes/game.routes"));

// -------------------------------------------------------------
// ✅ Scoped raw-body only for webhook route
// -------------------------------------------------------------
const rawJson = bodyParser.raw({ type: "application/json" });
app.post(
  "/api/nowpayments/webhook",
  rawJson,
  (req, res, next) => {
    // Preserve raw body for signature verification
    req.rawBody = req.body && Buffer.isBuffer(req.body) ? req.body.toString() : "";
    try {
      req.body = req.rawBody ? JSON.parse(req.rawBody) : {};
    } catch {
      req.body = {};
    }
    next();
  },
  require("./routes/webhook.routes")
);

// -------------------------------------------------------------
// ✅ Database connection and server start
// -------------------------------------------------------------
const PORT = process.env.PORT || 7012;

(async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`wallet-service listening on :${PORT}`));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
