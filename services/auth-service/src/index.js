require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('@casino/shared/db/connection');
const {
  corsMiddleware,
  helmetMiddleware,
  compressionMiddleware,
  sanitizeMiddleware,
  hppMiddleware,
} = require('./middleware/security');
// const { init: initRedis } = require('../../shared/redis/redisClient');
const routes = require('./routes/auth.routes');

const app = express();
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeMiddleware);
app.use(hppMiddleware);
app.use(compressionMiddleware);

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

