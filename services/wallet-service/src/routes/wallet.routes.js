const router = require('express').Router();
const ctrl = require('../controllers/wallet.controller');

router.get('/coins', ctrl.getCoins);
router.get('/:userId/deposit-address', ctrl.getDepositAddress);
router.get('/:userId/balance', ctrl.getBalance);
router.get('/:userId/transactions', ctrl.getTransactions);
router.post('/:userId/withdraw', ctrl.requestWithdraw);

// Admin/worker route to actually send payout via NOWP
router.post('/withdraw/execute/:txId', ctrl.executeWithdraw);

// Withdraw with OTP
router.post('/:userId/withdrawOtp', ctrl.requestWithdrawOTP);
router.post('/verify-otp', ctrl.verifyWithdrawOtp);

module.exports = router;
