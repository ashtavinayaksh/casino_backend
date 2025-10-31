const express = require('express');
const r = express.Router();
const c = require('../controllers/auth.controller');
r.post('/register', c.register);
r.post('/login', c.login);
r.post('/siwe', c.siwe);
r.get('/profile/:idOrUsername', c.getProfile);
r.post('/change-password', c.changePassword);
r.post('/forgot-password', c.forgotPassword);
r.post('/send-otp', c.sendOtp);
r.post('/verify-email', c.verifyEmail);
r.post('/enable-2fa', c.enableTwoFactor);   // Generate secret + QR URL
r.post('/verify-2fa', c.verifyTwoFactor);   // Verify 6-digit token
r.post("/google", c.googleAuth);

module.exports = r;
