const fs = require('fs');
const file = 'D:/Ara Web/react-ecommerce/backend/controllers/orderController.js';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('const Return = require')) {
    content = content.replace(/const Order = require\('\.\.\/models\/Order'\);/, 
        "const Order = require('../models/Order');\n" +
        "const Return = require('../models/Return');\n" +
        "const Refund = require('../models/Refund');\n" +
        "const Wallet = require('../models/Wallet');\n" +
        "const Transaction = require('../models/Transaction');"
    );
    fs.writeFileSync(file, content);
    console.log('Fixed imports in orderController');
}
