const Transaction = require('../models/Transaction');
const Order = require('../models/Order');

// @desc    Get all transactions (ledger)
// @route   GET /api/transactions
// @access  Private/Admin
const getTransactions = async (req, res) => {
    try {
        // 1. Fetch wallet transactions (populate wallet and the wallet's user details)
        const walletTxns = await Transaction.find({})
            .populate({
                path: 'wallet',
                populate: { path: 'user', select: 'name email' }
            })
            .lean();

        const formattedWalletTxns = walletTxns.map(txn => ({
            _id: txn._id,
            type: txn.type,
            amount: txn.amount,
            description: txn.description,
            user: txn.wallet?.user || null,
            createdAt: txn.createdAt
        }));

        // 2. Fetch paid orders directly to ensure retro-compatibility
        const paidOrders = await Order.find({ isPaid: true })
            .populate('user', 'name email')
            .lean();

        const orderTxns = paidOrders.map(order => ({
            _id: order._id,
            type: 'Credit',
            amount: order.totalPrice,
            description: `Payment received for Order #${order._id.toString().substring(0, 8)} (${order.paymentMethod || 'Online'})`,
            user: order.user || null,
            createdAt: order.paidAt || order.createdAt
        }));

        // 3. Merge and sort by date descending
        const allTxns = [...formattedWalletTxns, ...orderTxns].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json(allTxns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getTransactions };
