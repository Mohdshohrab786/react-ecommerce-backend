const fs = require('fs');
const file = 'D:/Ara Web/react-ecommerce/backend/controllers/orderController.js';
let content = fs.readFileSync(file, 'utf8');

const imports = [
    "const Return = require('../models/Return');",
    "const Refund = require('../models/Refund');",
    "const Wallet = require('../models/Wallet');",
    "const Transaction = require('../models/Transaction');"
];

let injected = false;
imports.forEach(imp => {
    if (!content.includes(imp)) {
        content = imp + '\n' + content;
        injected = true;
    }
});

if (injected) {
    fs.writeFileSync(file, content);
    console.log('Prepended missing imports in orderController');
}
