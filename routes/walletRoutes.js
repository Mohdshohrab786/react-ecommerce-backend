const express = require('express');
const router = express.Router();
const { getWallet, getWalletBalance, getWalletTransactions } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getWallet);
router.route('/balance').get(protect, getWalletBalance);
router.route('/transactions').get(protect, getWalletTransactions);

module.exports = router;
