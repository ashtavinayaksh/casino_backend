const router = require('express').Router();
const { handleIpn } = require('../controllers/nowp.webhook.controller');
const { verifyNowpSignature } = require('../middleware/verifyNowpSignature');

router.post('/nowp/ipn', verifyNowpSignature(process.env.NOWP_IPN_SECRET), handleIpn);

module.exports = router;
