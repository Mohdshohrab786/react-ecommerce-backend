const fs = require('fs');
const file = 'D:/Ara Web/react-ecommerce/backend/controllers/adminWalletController.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\\`/g, '`');
fs.writeFileSync(file, content);
console.log('Fixed syntax in adminWalletController.js');
