const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'dev_secret';
function generateToken(payload){ return jwt.sign(payload, secret, { expiresIn: '30d' }); }
function verifyToken(t){ try{return jwt.verify(t,secret);}catch(e){return null;} }
module.exports = { generateToken, verifyToken };
