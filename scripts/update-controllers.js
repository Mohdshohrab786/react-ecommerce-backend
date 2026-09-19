const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../controllers/orderController.js');
let code = fs.readFileSync(file, 'utf8');

// We will inject the refund logic right after `order.status = 'Cancelled';`
const refundSnippet = `
        order.status = 'Cancelled';
        order.cancellationReason = reason || 'Cancelled by customer';
        
        let refundProcessed = false;
        // Refund logic
        if (order.isPaid || order.totalPaid > 0) {
            const amountToRefund = order.totalPaid > 0 ? order.totalPaid : order.totalPrice;
            const settings = await Setting.findOne();
            
            // Generate unique reference
            const refundRef = \`REFUND-CANC-\${order._id}-\${Date.now()}\`;
            
            // Check for duplicate refund
            const existingRefund = await Refund.findOne({ order: order._id, status: 'COMPLETED' });
            if (!existingRefund) {
                const refund = new Refund({
                    user: order.user,
                    order: order._id,
                    amount: amountToRefund,
                    type: 'CANCELLATION',
                    status: settings.isRefundToWalletEnabled ? 'COMPLETED' : 'PENDING',
                    referenceId: refundRef,
                    reason: order.cancellationReason
                });
                
                if (settings.isRefundToWalletEnabled) {
                    let wallet = await Wallet.findOne({ user: order.user });
                    if (!wallet) {
                        wallet = new Wallet({ user: order.user, balance: 0, totalCredited: 0, totalDebited: 0 });
                    }
                    const balBefore = wallet.balance;
                    wallet.balance += amountToRefund;
                    wallet.totalCredited += amountToRefund;
                    await wallet.save();
                    
                    await Transaction.create({
                        wallet: wallet._id,
                        user: order.user,
                        order: order._id,
                        refund: refund._id,
                        type: 'REFUND',
                        amount: amountToRefund,
                        direction: 'CREDIT',
                        balanceBefore: balBefore,
                        balanceAfter: wallet.balance,
                        referenceId: \`WLT-\${refundRef}\`,
                        description: \`Refund for cancelled order #\${order.orderNumber || order._id.toString().substring(0,8)}\`,
                        status: 'COMPLETED'
                    });
                    
                    refund.paymentId = \`WLT-\${refundRef}\`;
                    refundProcessed = true;
                }
                
                await refund.save();
            }
        }
`;

code = code.replace(
    /order\.status = 'Cancelled';\s*order\.cancellationReason = reason \|\| 'Cancelled by customer';/,
    refundSnippet
);

// We need to add eligibility APIs
const eligibilityApis = `
// @desc    Check cancellation eligibility
// @route   GET /api/orders/:id/cancellation-eligibility
// @access  Private
const getCancellationEligibility = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        const settings = await Setting.findOne();
        if (settings && !settings.isCancellationEnabled) {
            return res.json({ canCancel: false, reason: 'Cancellation is currently disabled' });
        }
        
        if (order.status === 'Cancelled') return res.json({ canCancel: false, reason: 'Order is already cancelled' });
        if (order.status === 'Shipped' || order.status === 'OutForDelivery' || order.status === 'Delivered') {
            return res.json({ canCancel: false, reason: 'Order cannot be cancelled at this stage' });
        }
        
        return res.json({ canCancel: true, reason: null });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check return eligibility
// @route   GET /api/orders/:id/return-eligibility
// @access  Private
const getReturnEligibility = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        const settings = await Setting.findOne();
        if (settings && !settings.isReturnsEnabled) {
            return res.json({ canReturn: false, reason: 'Returns are currently disabled' });
        }
        
        if (!order.isDelivered || order.status !== 'Delivered') {
            return res.json({ canReturn: false, reason: 'Order is not delivered yet' });
        }
        
        const deliveredDate = new Date(order.deliveredAt || order.updatedAt);
        const windowDays = (settings && settings.returnWindowDays) || 7;
        const deadline = new Date(deliveredDate);
        deadline.setDate(deadline.getDate() + windowDays);
        
        if (new Date() > deadline) {
            return res.json({ canReturn: false, reason: 'Return window has expired' });
        }
        
        // Check if return already exists
        const existingReturn = await Return.findOne({ order: order._id, status: { $ne: 'CANCELLED' } });
        if (existingReturn) {
            return res.json({ canReturn: false, reason: 'Return already requested', return: existingReturn });
        }
        
        return res.json({ canReturn: true, reason: null });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
`;

code = code.replace(
    /module\.exports = \{/,
    eligibilityApis + '\nmodule.exports = {'
);

code = code.replace(
    /module\.exports = \{/,
    `module.exports = { 
    getCancellationEligibility,
    getReturnEligibility,`
);

// We need to inject returnOrder logic that creates Return object instead of just updating order status.
const returnSnippet = `
        order.status = 'Returned';
        order.returnReason = returnReason || 'Return requested by customer';
        order.returnRequestDate = Date.now();
        // order.isDelivered = false; // keep it true to know it was delivered

        const returnItems = order.orderItems.map(item => ({
            name: item.name,
            qty: item.qty,
            price: item.price,
            product: item.product
        }));

        const newReturn = new Return({
            user: order.user,
            order: order._id,
            returnItems,
            reason: order.returnReason,
            refundAmount: order.totalPaid > 0 ? order.totalPaid : order.totalPrice,
            status: 'REQUESTED'
        });
        await newReturn.save();
`;

code = code.replace(
    /order\.status = 'Returned';\s*order\.returnReason = returnReason \|\| 'Return requested by customer';\s*order\.returnRequestDate = Date\.now\(\);\s*order\.isDelivered = false;/,
    returnSnippet
);

fs.writeFileSync(file, code);
console.log('Order controller updated');
