// src/middleware/security.js
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

function cleanCorsHeaders(req, res, next) {
  res.removeHeader("Access-Control-Allow-Origin");
  res.removeHeader("Access-Control-Allow-Credentials");
  next();
}

const allowedOrigins = [
  'https://moonbet-casino.vercel.app',
  'https://moonbet-casino.vercel.app/',
  'https://casino.zazu.games/',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://mapi.examtree.ai',
  'https://www.mapi.examtree.ai',
];

const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow non-browser tools like Postman or curl
    if (!origin) return callback(null, true);

    // Normalize origin (remove trailing slash)
    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked from: ${origin}`);
      callback(new Error('CORS not allowed for this origin'));
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
  cleanCorsHeaders,
  corsMiddleware,
  helmetMiddleware,
  compressionMiddleware,
  sanitizeMiddleware,
  hppMiddleware,
};
