const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../controllers/orderController.js');
let code = fs.readFileSync(file, 'utf8');

const payWithWalletApi = `
// @desc    Pay order fully with wallet
// @route   POST /api/orders/:id/pay-with-wallet
// @access  Private
const payWithWallet = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        if (order.isPaid) {
            return res.status(400).json({ message: 'Order is already paid' });
        }
        
        const settings = await Setting.findOne();
        if (settings && !settings.isWalletPaymentEnabled) {
            return res.status(400).json({ message: 'Wallet payments are disabled' });
        }
        
        const wallet = await Wallet.findOne({ user: req.user._id });
        if (!wallet || wallet.balance < order.totalPrice) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
        }
        
        // Deduct from wallet
        const balBefore = wallet.balance;
        wallet.balance -= order.totalPrice;
        wallet.totalDebited += order.totalPrice;
        await wallet.save();
        
        // Create transaction
        const refId = \`WLT-PAY-ORD-\${order._id}-\${Date.now()}\`;
        await Transaction.create({
            wallet: wallet._id,
            user: req.user._id,
            order: order._id,
            type: 'WALLET_PAYMENT',
            amount: order.totalPrice,
            direction: 'DEBIT',
            balanceBefore: balBefore,
            balanceAfter: wallet.balance,
            referenceId: refId,
            description: \`Paid for order #\${order.orderNumber || order._id.toString().substring(0,8)} using Wallet\`,
            status: 'COMPLETED'
        });
        
        // Mark order paid
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentMethod = 'Wallet';
        order.walletAmount = order.totalPrice;
        order.onlineAmount = 0;
        order.totalPaid = order.totalPrice;
        order.paymentResult = {
            id: refId,
            status: 'completed',
            update_time: new Date().toISOString(),
            email_address: req.user.email
        };
        
        const updatedOrder = await order.save();
        return res.json({ message: 'Payment successful using Wallet', order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
`;

code = code.replace(
    /module\.exports = \{/,
    payWithWalletApi + '\nmodule.exports = {'
);

code = code.replace(
    /module\.exports = \{/,
    `module.exports = { 
    payWithWallet,`
);

// Now update `verifyRazorpayPayment` to handle mixed payments.
// Find `if (razorpay_signature === expectedSign) {` and modify logic.
// We'll replace verifyRazorpayPayment fully.

const verifyRazorpayCode = `
// @desc    Verify Razorpay Payment
// @route   POST /api/orders/:id/verify-razorpay-payment
// @access  Private
const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, walletAmountUsed } = req.body;
        
        const settings = await Setting.findOne({});
        if (!settings || !settings.razorpayKeySecret) {
            return res.status(400).json({ message: 'Razorpay keys not configured' });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", settings.razorpayKeySecret)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            const order = await Order.findById(req.params.id);
            if (order) {
                let walletDeducted = 0;
                
                // If user used wallet for mixed payment
                if (walletAmountUsed > 0 && settings.isMixedPaymentEnabled) {
                    const wallet = await Wallet.findOne({ user: order.user });
                    if (wallet && wallet.balance >= walletAmountUsed) {
                        const balBefore = wallet.balance;
                        wallet.balance -= walletAmountUsed;
                        wallet.totalDebited += walletAmountUsed;
                        await wallet.save();
                        walletDeducted = walletAmountUsed;
                        
                        await Transaction.create({
                            wallet: wallet._id,
                            user: order.user,
                            order: order._id,
                            type: 'WALLET_PAYMENT',
                            amount: walletAmountUsed,
                            direction: 'DEBIT',
                            balanceBefore: balBefore,
                            balanceAfter: wallet.balance,
                            referenceId: \`WLT-PAY-MIX-\${order._id}-\${Date.now()}\`,
                            description: \`Partial Wallet payment for Order #\${order.orderNumber || order._id.toString().substring(0, 8)}\`,
                            status: 'COMPLETED'
                        });
                    }
                }
                
                order.isPaid = true;
                order.paidAt = Date.now();
                order.paymentMethod = walletDeducted > 0 ? 'Wallet + Razorpay' : 'Razorpay';
                order.walletAmount = walletDeducted;
                order.onlineAmount = order.totalPrice - walletDeducted;
                order.totalPaid = order.totalPrice;
                
                order.paymentResult = {
                    id: razorpay_payment_id,
                    status: 'verified',
                    update_time: new Date().toISOString(),
                    email_address: req.user.email
                };

                const updatedOrder = await order.save();

                // Create transaction ledger record for the online part
                try {
                    let wallet = await Wallet.findOne({ user: order.user });
                    if (!wallet) {
                        wallet = await Wallet.create({ user: order.user, balance: 0, totalCredited: 0, totalDebited: 0 });
                    }
                    
                    if (order.onlineAmount > 0) {
                        // The online amount is paid to the store, we just record it in order, 
                        // optionally as a wallet passthrough if needed, but the prompt says 
                        // "Create ONE refund transaction... prevent duplicate accounting".
                        // So we won't put online payments into the wallet ledger unless it's a deposit.
                        // We'll log it as ORDER_PAYMENT but without balance change to wallet? 
                        // Actually, standard e-commerce: wallet transactions only for wallet changes.
                    }
                } catch (txnError) {
                    console.error('Failed to create transaction record:', txnError.message);
                }

                return res.json({ message: "Payment verified successfully", order: updatedOrder });
            } else {
                return res.status(404).json({ message: 'Order not found' });
            }
        } else {
            return res.status(400).json({ message: "Invalid signature sent!" });
        }
    } catch (error) {
        console.error('Razorpay Verify Error:', error);
        res.status(500).json({ message: error.message });
    }
};
`;

// Replace verifyRazorpayPayment function with the new one
code = code.replace(
    /\/\/ @desc    Verify Razorpay Payment[\s\S]*?(?=\/\/ @desc    Delete single order)/,
    verifyRazorpayCode + '\n'
);

// We need to fix createRazorpayOrder to account for walletAmount Used
const createRazorpayCode = `
// @desc    Create Razorpay Order
// @route   POST /api/orders/:id/create-razorpay-order
// @access  Private
const createRazorpayOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        const { walletAmountUsed } = req.body || {};
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const settings = await Setting.findOne({});
        if (!settings || !settings.razorpayKeyId || !settings.razorpayKeySecret) {
            return res.status(400).json({ message: 'Razorpay keys not configured in admin settings' });
        }
        
        let payableAmount = order.totalPrice;
        if (walletAmountUsed > 0 && settings.isMixedPaymentEnabled) {
            payableAmount = order.totalPrice - walletAmountUsed;
        }

        const instance = new Razorpay({
            key_id: settings.razorpayKeyId,
            key_secret: settings.razorpayKeySecret,
        });

        const options = {
            amount: Math.round(payableAmount * 100), // amount in smallest currency unit (e.g. paise)
            currency: settings.currency || "USD",
            receipt: \`receipt_order_\${order._id}\`,
        };

        const razorpayOrder = await instance.orders.create(options);
        if (!razorpayOrder) {
            return res.status(500).json({ message: 'Error creating Razorpay order' });
        }

        res.json(razorpayOrder);
    } catch (error) {
        console.error('Razorpay Order Create Error:', error);
        res.status(500).json({ message: error.message });
    }
};
`;

code = code.replace(
    /\/\/ @desc    Create Razorpay Order[\s\S]*?(?=\/\/ @desc    Verify Razorpay Payment)/,
    createRazorpayCode + '\n'
);


fs.writeFileSync(file, code);
console.log('Order controller updated for Wallet Pay and Mixed Pay');
