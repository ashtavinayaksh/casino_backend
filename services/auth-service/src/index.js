require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('../../shared/db/connection');
const { init: initRedis } = require('../../shared/redis/redisClient');
const routes = require('./routes/auth.routes');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    await initRedis(process.env.REDIS_URL || 'redis://localhost:6379');

    app.use('/api/auth', routes);             // ✅ Register routes after DB connects
    app.get('/healthz', (req, res) => res.json({ ok: true }));

    app.listen(PORT, () => console.log(`Auth service running on ${PORT}`));
  } catch (e) {
    console.error("Fatal startup error:", e);
    process.exit(1);
  }
})();

