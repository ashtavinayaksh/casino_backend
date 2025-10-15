const express = require('express');
const r = express.Router();
const c = require('../controllers/auth.controller');
r.post('/register', c.register);
r.post('/login', c.login);
r.post('/siwe', c.siwe);
module.exports = r;
