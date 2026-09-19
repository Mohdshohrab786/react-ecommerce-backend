const fs = require('fs');
const file = 'D:/Ara Web/react-ecommerce/backend/controllers/orderController.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const \{ returnReason \} = req\.body;/, 'const { returnReason, requestType } = req.body;');
code = code.replace(/order\.returnReason = returnReason \|\| 'Return requested by customer';/, 
    "order.returnReason = `[${requestType || 'RETURN'}] ${returnReason || 'Requested by customer'}`;");
code = code.replace(/order\.status = 'Returned';/, 
    "order.status = requestType === 'REPLACEMENT' ? 'Replacement Requested' : 'Returned';");

fs.writeFileSync(file, code);
console.log('orderController.js updated for return types');
