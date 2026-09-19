const fs = require('fs');
const file = 'D:/Ara Web/react-ecommerce/backend/controllers/orderController.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /if \(order\.status === 'Shipped' \|\| order\.status === 'OutForDelivery' \|\| order\.status === 'Delivered'\)/g,
    "if (['Shipped', 'OutForDelivery', 'Delivered', 'Returned', 'Replacement Requested'].includes(order.status))"
);

code = code.replace(
    /if \(\!order\.isDelivered \|\| order\.status !== 'Delivered'\) \{\s*return res\.json\(\{ canReturn: false, reason: 'Order is not delivered yet' \}\);\s*\}/,
    `
        if (!order.isDelivered) {
            return res.json({ canReturn: false, reason: 'Order is not delivered yet' });
        }
    `
);

fs.writeFileSync(file, code);
console.log('Fixed eligibility bugs');
