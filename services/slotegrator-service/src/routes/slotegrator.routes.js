const express = require('express');
const router = express.Router();
const { verifySlotHmac } = require('../middleware/verifySlotHmac');
const { handleAction } = require('../controllers/slotgrator.controller');

router.post('/callbacks/aggregator', verifySlotHmac, handleAction);

module.exports = router;
