
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDB } = require('../../shared/db/connection');

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

app.use(cors());
app.use(morgan('dev'));

// routes
app.use('/api/wallet', require('./routes/wallet.routes'));
app.use('/api', require('./routes/webhook.routes'));
app.use("/api/slotgrator", require("./routes/slotgrator.routes"));

const PORT = process.env.PORT || 7012;

(async () => {
  await connectDB(process.env.MONGO_URI);
  app.listen(PORT, () => console.log(`wallet-service listening on :${PORT}`));
})().catch(e => { console.error(e); process.exit(1); });

