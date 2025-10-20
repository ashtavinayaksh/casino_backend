
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDB } = require('@casino/shared/db/connection');

const app = express();

// capture raw body for HMAC verification
app.use((req, res, next) => {
  let data = [];
  req.on('data', chunk => data.push(chunk));
  req.on('end', () => {
    if (data.length) req.rawBody = Buffer.concat(data).toString();
    try { req.body = req.rawBody ? JSON.parse(req.rawBody) : {}; } catch { req.body = {}; }
    next();
  });
});

app.use(
  cors({
    origin: [
      "https://moonbet-casino.vercel.app/",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan('dev'));

// routes
app.use('/api/wallet', require('./routes/wallet.routes'));
app.use('/api', require('./routes/webhook.routes')); //for confirmation for wallet balance update
app.use("/api/slotgrator", require("./routes/slotgrator.routes"));
app.use("/api/games", require("./routes/game.routes"));

const PORT = process.env.PORT || 7012;

(async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`wallet-service listening on :${PORT}`));
})().catch(e => { console.error(e); process.exit(1); });

