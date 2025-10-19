const express = require('express');
const r = express.Router();
const c = require('../controllers/auth.controller');
r.post('/register', c.register);
r.post('/login', c.login);
r.post('/siwe', c.siwe);
r.get('/profile/:idOrUsername', c.getProfile);
r.post('/change-password', c.changePassword);
r.post('/forgot-password', c.forgotPassword);
r.post('/send-otp', c.sendOtp);       // ⬅️ NEW
r.post('/verify-email', c.verifyEmail);
module.exports = r;
