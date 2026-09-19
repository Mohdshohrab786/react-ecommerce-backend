const fs = require('fs');
const file = 'D:/Ara Web/react-ecommerce/backend/controllers/adminWalletController.js';
let code = fs.readFileSync(file, 'utf8');

const newLogic = `
        if (status === 'APPROVED') {
            returnReq.approvedAt = Date.now();
            
            // Check if it's a Replacement
            const isReplacement = returnReq.reason && returnReq.reason.includes('[REPLACEMENT]');
            
            // Refund to wallet immediately if it's a Return and not already refunded
            if (!isReplacement && returnReq.status !== 'REFUNDED') {
                const existingRefund = await Refund.findOne({ returnRequest: returnReq._id, status: 'COMPLETED' });
                if (!existingRefund) {
                    const refundRef = \`REFUND-RET-\${returnReq._id}-\${Date.now()}\`;
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
                        referenceId: \`WLT-\${refundRef}\`,
                        description: \`Auto-refund for approved return\`,
                        status: 'COMPLETED'
                    });
                    
                    refund.paymentId = \`WLT-\${refundRef}\`;
                    await refund.save();
                    
                    returnReq.completedAt = Date.now();
                    returnReq.status = 'REFUNDED';
                    await returnReq.save();
                    
                    return res.json(returnReq); // Exit early since we changed status to REFUNDED
                }
            }
        }
        
        if (status === 'REJECTED') returnReq.rejectedAt = Date.now();
`;

// Replace from 'if (status === 'APPROVED') returnReq.approvedAt = Date.now();' to 'if (status === 'REJECTED') returnReq.rejectedAt = Date.now();'
code = code.replace(/if \(status === 'APPROVED'\) returnReq\.approvedAt = Date\.now\(\);\s*if \(status === 'REJECTED'\) returnReq\.rejectedAt = Date\.now\(\);/, newLogic);

fs.writeFileSync(file, code);
console.log('adminWalletController.js updated for auto-refund on approval');
