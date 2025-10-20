require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('@casino/shared/db/connection');
// const { init: initRedis } = require('../../shared/redis/redisClient');
const routes = require('./routes/auth.routes');

const app = express();
app.use(
  cors({
    origin: [
      "https://moonbet-casino.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB();
    // await initRedis(process.env.REDIS_URL || 'redis://localhost:6379');

    app.use('/api/auth', routes);             // ✅ Register routes after DB connects
    // app.get('/healthz', (req, res) => res.json({ ok: true }));

    app.listen(PORT, () => console.log(`Auth service running on ${PORT}`));
  } catch (e) {
    console.error("Fatal startup error:", e);
    process.exit(1);
  }
})();

