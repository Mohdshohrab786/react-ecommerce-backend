const fs = require('fs');
const file = 'D:/Ara Web/react-ecommerce/backend/controllers/adminWalletController.js';
let code = fs.readFileSync(file, 'utf8');

// First, ensure Order is imported
if (!code.includes("const Order = require('../models/Order');")) {
    code = "const Order = require('../models/Order');\n" + code;
}

// Update the early exit block for Auto-Refund
const earlyExitSearch = `                    returnReq.completedAt = Date.now();
                    returnReq.status = 'REFUNDED';
                    await returnReq.save();
                    
                    return res.json(returnReq);`;

const earlyExitReplace = `                    returnReq.completedAt = Date.now();
                    returnReq.status = 'REFUNDED';
                    await returnReq.save();
                    
                    const ord = await Order.findById(returnReq.order);
                    if (ord) {
                        ord.status = 'Refunded';
                        await ord.save();
                    }
                    
                    return res.json(returnReq);`;
code = code.replace(earlyExitSearch, earlyExitReplace);

// Update the bottom block for manual status updates
const bottomSearch = `        returnReq.status = status;
        await returnReq.save();
        
        res.json(returnReq);`;

const bottomReplace = `        returnReq.status = status;
        await returnReq.save();
        
        const ord = await Order.findById(returnReq.order);
        if (ord) {
            const isReplacement = returnReq.reason && returnReq.reason.includes('[REPLACEMENT]');
            if (status === 'REJECTED') {
                ord.status = 'Delivered'; // Revert back to delivered since it was rejected
            } else if (status === 'REFUNDED') {
                ord.status = 'Refunded';
            } else if (isReplacement && status === 'RECEIVED') {
                ord.status = 'Replaced';
            }
            await ord.save();
        }
        
        res.json(returnReq);`;
code = code.replace(bottomSearch, bottomReplace);

fs.writeFileSync(file, code);
console.log('adminWalletController.js updated to sync Order status');
