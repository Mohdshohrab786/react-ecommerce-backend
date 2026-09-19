const fs = require('fs');
const file = 'D:/Ara Web/react-ecommerce/backend/models/Order.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /enum: \['Pending', 'Confirmed', 'Processing', 'Shipped', 'OutForDelivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'\]/,
    "enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'OutForDelivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded', 'Replacement Requested', 'Replaced']"
);

fs.writeFileSync(file, code);
console.log('Order.js enum updated');
