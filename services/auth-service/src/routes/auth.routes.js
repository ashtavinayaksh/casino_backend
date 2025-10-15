const express = require('express');
const r = express.Router();
const c = require('../controllers/auth.controller');
r.post('/register', c.register);
r.post('/login', c.login);
r.post('/siwe', c.siwe);
r.get('/profile/:idOrUsername', c.getProfile);
module.exports = r;
