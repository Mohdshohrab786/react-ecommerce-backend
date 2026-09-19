const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// Helper to ensure wallet exists
const getOrCreateWallet = async (userId, session = null) => {
    let wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
        wallet = new Wallet({ user: userId, balance: 0, totalCredited: 0, totalDebited: 0 });
        await wallet.save({ session });
    }
    return wallet;
};

// @desc    Get user wallet details
// @route   GET /api/wallet
// @access  Private
const getWallet = async (req, res) => {
    try {
        const wallet = await getOrCreateWallet(req.user._id);
        res.json({ success: true, wallet });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user wallet balance
// @route   GET /api/wallet/balance
// @access  Private
const getWalletBalance = async (req, res) => {
    try {
        const wallet = await getOrCreateWallet(req.user._id);
        res.json({ success: true, balance: wallet.balance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user wallet transactions
// @route   GET /api/wallet/transactions
// @access  Private
const getWalletTransactions = async (req, res) => {
    try {
        const wallet = await getOrCreateWallet(req.user._id);
        const transactions = await Transaction.find({ wallet: wallet._id })
            .populate('order', 'orderNumber')
            .sort({ createdAt: -1 });
        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getWallet,
    getWalletBalance,
    getWalletTransactions,
    getOrCreateWallet
};
