const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

const { 
    getWallets, 
    getWalletByUserId, 
    getWalletTransactionsByUserId, 
    creditWallet, 
    debitWallet,
    getRefunds,
    processRefund,
    getReturns,
    updateReturnStatus
} = require('../controllers/adminWalletController');

router.route('/dashboard').get(protect, admin, getDashboardStats);

// Wallets
router.route('/wallets').get(protect, admin, getWallets);
router.route('/wallets/:userId').get(protect, admin, getWalletByUserId);
router.route('/wallets/:userId/transactions').get(protect, admin, getWalletTransactionsByUserId);
router.route('/wallets/:userId/credit').post(protect, admin, creditWallet);
router.route('/wallets/:userId/debit').post(protect, admin, debitWallet);

// Refunds
router.route('/refunds').get(protect, admin, getRefunds);
router.route('/refunds/:id/process').post(protect, admin, processRefund);

// Returns
router.route('/returns').get(protect, admin, getReturns);
router.route('/returns/:id/status').put(protect, admin, updateReturnStatus);

module.exports = router;
