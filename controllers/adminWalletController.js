const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Refund = require('../models/Refund');
const Return = require('../models/Return');
const Order = require('../models/Order');
const sendSMS = require('../utils/sendSMS');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all wallets
// @route   GET /api/admin/wallets
// @access  Private/Admin
const getWallets = async (req, res) => {
    try {
        const wallets = await Wallet.find({}).populate('user', 'name email phone');
        res.json(wallets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get specific user wallet
// @route   GET /api/admin/wallets/:userId
// @access  Private/Admin
const getWalletByUserId = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ user: req.params.userId }).populate('user', 'name email phone');
        if (wallet) {
            res.json(wallet);
        } else {
            res.status(404).json({ message: 'Wallet not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get specific user wallet transactions
// @route   GET /api/admin/wallets/:userId/transactions
// @access  Private/Admin
const getWalletTransactionsByUserId = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ user: req.params.userId });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
        
        const transactions = await Transaction.find({ wallet: wallet._id })
            .populate('order', 'orderNumber')
            .sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manually credit wallet
// @route   POST /api/admin/wallets/:userId/credit
// @access  Private/Admin
const creditWallet = async (req, res) => {
    try {
        const { amount, reason } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        const wallet = await Wallet.findOne({ user: req.params.userId });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        const balBefore = wallet.balance;
        wallet.balance += Number(amount);
        wallet.totalCredited += Number(amount);
        await wallet.save();

        await Transaction.create({
            wallet: wallet._id,
            user: req.params.userId,
            type: 'MANUAL_CREDIT',
            amount: Number(amount),
            direction: 'CREDIT',
            balanceBefore: balBefore,
            balanceAfter: wallet.balance,
            referenceId: `WLT-MANUAL-CREDIT-\${Date.now()}`,
            description: reason || 'Manual credit by admin',
            status: 'COMPLETED',
            metadata: { adminId: req.user._id }
        });

        res.json(wallet);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manually debit wallet
// @route   POST /api/admin/wallets/:userId/debit
// @access  Private/Admin
const debitWallet = async (req, res) => {
    try {
        const { amount, reason } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        const wallet = await Wallet.findOne({ user: req.params.userId });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
        
        if (wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
        }

        const balBefore = wallet.balance;
        wallet.balance -= Number(amount);
        wallet.totalDebited += Number(amount);
        await wallet.save();

        await Transaction.create({
            wallet: wallet._id,
            user: req.params.userId,
            type: 'MANUAL_DEBIT',
            amount: Number(amount),
            direction: 'DEBIT',
            balanceBefore: balBefore,
            balanceAfter: wallet.balance,
            referenceId: `WLT-MANUAL-DEBIT-\${Date.now()}`,
            description: reason || 'Manual debit by admin',
            status: 'COMPLETED',
            metadata: { adminId: req.user._id }
        });

        res.json(wallet);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all refunds
// @route   GET /api/admin/refunds
// @access  Private/Admin
const getRefunds = async (req, res) => {
    try {
        const refunds = await Refund.find({}).populate('user', 'name email').populate('order', 'orderNumber').sort({ createdAt: -1 });
        res.json(refunds);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Process/Complete Refund
// @route   POST /api/admin/refunds/:id/process
// @access  Private/Admin
const processRefund = async (req, res) => {
    try {
        const refund = await Refund.findById(req.params.id);
        if (!refund) return res.status(404).json({ message: 'Refund not found' });
        
        if (refund.status === 'COMPLETED') {
            return res.status(400).json({ message: 'Refund already completed' });
        }
        
        // Actually complete it (assuming refund to wallet for now)
        let wallet = await Wallet.findOne({ user: refund.user });
        if (!wallet) {
            wallet = new Wallet({ user: refund.user, balance: 0, totalCredited: 0, totalDebited: 0 });
        }
        
        const balBefore = wallet.balance;
        wallet.balance += refund.amount;
        wallet.totalCredited += refund.amount;
        await wallet.save();
        
        const refId = `WLT-REF-\${refund._id}-\${Date.now()}`;
        await Transaction.create({
            wallet: wallet._id,
            user: refund.user,
            order: refund.order,
            refund: refund._id,
            type: 'REFUND',
            amount: refund.amount,
            direction: 'CREDIT',
            balanceBefore: balBefore,
            balanceAfter: wallet.balance,
            referenceId: refId,
            description: `Manual processing of refund #\${refund.referenceId}`,
            status: 'COMPLETED',
            metadata: { adminId: req.user._id }
        });
        
        refund.status = 'COMPLETED';
        refund.paymentId = refId;
        refund.processedBy = req.user._id;
        refund.processedAt = Date.now();
        await refund.save();
        
        res.json(refund);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all returns
// @route   GET /api/admin/returns
// @access  Private/Admin
const getReturns = async (req, res) => {
    try {
        const returns = await Return.find({}).populate('user', 'name email').populate('order', 'orderNumber').sort({ createdAt: -1 });
        res.json(returns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Return Status
// @route   PUT /api/admin/returns/:id/status
// @access  Private/Admin
const updateReturnStatus = async (req, res) => {
    try {
        const returnReq = await Return.findById(req.params.id);
        if (!returnReq) return res.status(404).json({ message: 'Return not found' });
        
        const { status } = req.body;
        
        
        if (status === 'APPROVED') {
            returnReq.approvedAt = Date.now();
            
            // Check if it's a Replacement
            const isReplacement = returnReq.reason && returnReq.reason.includes('[REPLACEMENT]');
            
            // Refund to wallet immediately if it's a Return and not already refunded
            if (!isReplacement && returnReq.status !== 'REFUNDED') {
                const existingRefund = await Refund.findOne({ returnRequest: returnReq._id, status: 'COMPLETED' });
                if (!existingRefund) {
                    const refundRef = `REFUND-RET-${returnReq._id}-${Date.now()}`;
                    const refund = new Refund({
                        user: returnReq.user,
                        order: returnReq.order,
                        returnRequest: returnReq._id,
                        amount: returnReq.refundAmount,
                        type: 'RETURN',
                        status: 'COMPLETED',
                        referenceId: refundRef,
                        reason: 'Return approved and auto-refunded to wallet',
                        processedBy: req.user._id,
                        processedAt: Date.now()
                    });
                    
                    let wallet = await Wallet.findOne({ user: returnReq.user });
                    if (!wallet) {
                        wallet = new Wallet({ user: returnReq.user, balance: 0, totalCredited: 0, totalDebited: 0 });
                    }
                    const balBefore = wallet.balance;
                    wallet.balance += returnReq.refundAmount;
                    wallet.totalCredited += returnReq.refundAmount;
                    await wallet.save();
                    
                    await Transaction.create({
                        wallet: wallet._id,
                        user: returnReq.user,
                        order: returnReq.order,
                        returnRequest: returnReq._id,
                        refund: refund._id,
                        type: 'REFUND',
                        amount: returnReq.refundAmount,
                        direction: 'CREDIT',
                        balanceBefore: balBefore,
                        balanceAfter: wallet.balance,
                        referenceId: `WLT-${refundRef}`,
                        description: `Auto-refund for approved return`,
                        status: 'COMPLETED'
                    });
                    
                    refund.paymentId = `WLT-${refundRef}`;
                    await refund.save();
                    
                    returnReq.completedAt = Date.now();
                    returnReq.status = 'REFUNDED';
                    await returnReq.save();
                    
                    const ord = await Order.findById(returnReq.order).populate('user', 'name email');
                    if (ord) {
                        ord.status = 'Refunded';
                        await ord.save();

                        // Notify User via SMS & Email
                        const phone = ord.shippingAddress?.phone;
                        const message = `Hi ${ord.user.name}, your return for order #${ord.orderNumber} is approved. Rs.${returnReq.refundAmount} has been refunded to your wallet.`;
                        if (phone) {
                            sendSMS({ phone, message }).catch(e => console.error("SMS Error:", e));
                        }
                        if (ord.user.email) {
                            sendEmail({
                                email: ord.user.email,
                                subject: 'Refund Processed to Wallet',
                                message
                            }).catch(e => console.error("Email Error:", e));
                        }
                    }
                    
                    return res.json(returnReq); // Exit early since we changed status to REFUNDED
                }
            }
        }
        
        if (status === 'REJECTED') returnReq.rejectedAt = Date.now();

        
        // If it's being refunded
        if (status === 'REFUNDED' && returnReq.status !== 'REFUNDED') {
            const existingRefund = await Refund.findOne({ returnRequest: returnReq._id, status: 'COMPLETED' });
            if (!existingRefund) {
                // Create refund record
                const refundRef = `REFUND-RET-${returnReq._id}-${Date.now()}`;
                const refund = new Refund({
                    user: returnReq.user,
                    order: returnReq.order,
                    returnRequest: returnReq._id,
                    amount: returnReq.refundAmount,
                    type: 'RETURN',
                    status: 'COMPLETED',
                    referenceId: refundRef,
                    reason: 'Return approved and refunded',
                    processedBy: req.user._id,
                    processedAt: Date.now()
                });
                
                // Credit wallet
                let wallet = await Wallet.findOne({ user: returnReq.user });
                if (!wallet) {
                    wallet = new Wallet({ user: returnReq.user, balance: 0, totalCredited: 0, totalDebited: 0 });
                }
                const balBefore = wallet.balance;
                wallet.balance += returnReq.refundAmount;
                wallet.totalCredited += returnReq.refundAmount;
                await wallet.save();
                
                await Transaction.create({
                    wallet: wallet._id,
                    user: returnReq.user,
                    order: returnReq.order,
                    returnRequest: returnReq._id,
                    refund: refund._id,
                    type: 'REFUND',
                    amount: returnReq.refundAmount,
                    direction: 'CREDIT',
                    balanceBefore: balBefore,
                    balanceAfter: wallet.balance,
                    referenceId: `WLT-\${refundRef}`,
                    description: `Refund for return request on order`,
                    status: 'COMPLETED'
                });
                
                refund.paymentId = `WLT-\${refundRef}`;
                await refund.save();
            }
            returnReq.completedAt = Date.now();
        }
        
        returnReq.status = status;
        await returnReq.save();
        
        const ord = await Order.findById(returnReq.order).populate('user', 'name email');
        if (ord) {
            const isReplacement = returnReq.reason && returnReq.reason.includes('[REPLACEMENT]');
            if (status === 'REJECTED') {
                ord.status = 'Delivered'; // Revert back to delivered since it was rejected
            } else if (status === 'REFUNDED') {
                ord.status = 'Refunded';
                
                // Notify User via SMS & Email
                const phone = ord.shippingAddress?.phone;
                const message = `Hi ${ord.user.name}, your refund of Rs.${returnReq.refundAmount} for order #${ord.orderNumber} has been processed to your wallet.`;
                if (phone) {
                    sendSMS({ phone, message }).catch(e => console.error("SMS Error:", e));
                }
                if (ord.user.email) {
                    sendEmail({
                        email: ord.user.email,
                        subject: 'Refund Processed to Wallet',
                        message
                    }).catch(e => console.error("Email Error:", e));
                }
            } else if (isReplacement && status === 'RECEIVED') {
                // Naya order banane ke bajaye, purane order ka hi status reset kar do
                ord.status = 'Processing';
                ord.isDelivered = false; // Taki admin dobara "Mark Delivered" kar sake
                ord.deliveredAt = undefined;
            }
            await ord.save();
        }
        
        res.json(returnReq);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete multiple returns
// @route   DELETE /api/admin/returns
// @access  Private/Admin
const deleteReturns = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No return IDs provided' });
        }
        await Return.deleteMany({ _id: { $in: ids } });
        res.json({ message: 'Returns deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete multiple refunds
// @route   DELETE /api/admin/refunds
// @access  Private/Admin
const deleteRefunds = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No refund IDs provided' });
        }
        await Refund.deleteMany({ _id: { $in: ids } });
        res.json({ message: 'Refunds deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getWallets,
    getWalletByUserId,
    getWalletTransactionsByUserId,
    creditWallet,
    debitWallet,
    getRefunds,
    processRefund,
    getReturns,
    updateReturnStatus,
    deleteReturns,
    deleteRefunds
};
