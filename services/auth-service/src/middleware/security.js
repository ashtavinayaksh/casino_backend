// src/middleware/security.js
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

/**
 * ✅ CORS Configuration
 */
const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow Postman, curl, etc.

    const allowedOrigins = [
      'https://moonbet-casino.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`🚫 Blocked CORS from: ${origin}`);
      return callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400,
});

/**
 * ✅ Helmet Security
 */
const helmetMiddleware = helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // relaxed for APIs
});

/**
 * ✅ Other Middlewares
 */
const compressionMiddleware = compression();
const sanitizeMiddleware = mongoSanitize();
const hppMiddleware = hpp();

/**
 * Export all middlewares
 */
module.exports = {
  corsMiddleware,
  helmetMiddleware,
  compressionMiddleware,
  sanitizeMiddleware,
  hppMiddleware,
};
