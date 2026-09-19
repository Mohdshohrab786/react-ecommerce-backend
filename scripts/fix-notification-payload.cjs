const fs = require('fs');
const file = 'D:/Ara Web/react-ecommerce/backend/controllers/orderController.js';
let code = fs.readFileSync(file, 'utf8');

const searchNotification = `        // Admin Dashboard Notification
        try {
            const Notification = require('../models/Notification');
            const userName = req.user?.name || 'Customer';
            await Notification.create({
                user: req.user._id,
                type: 'return_request',
                title: \`Return Requested #\${orderIdStr}\`,
                message: \`Return requested for order #\${orderIdStr} by \${userName}. Reason: \${updatedOrder.returnReason}\`,
                link: '/admin/orderlist',
                meta: { orderId: updatedOrder._id, orderNumber: updatedOrder.orderNumber }
            });
        } catch (notiErr) {
            console.error('Failed to create return notification:', notiErr.message);
        }`;

const replaceNotification = `        // Admin Dashboard Notification
        try {
            const Notification = require('../models/Notification');
            const userName = req.user?.name || 'Customer';
            const reqTypeStr = requestType === 'REPLACEMENT' ? 'Replacement' : 'Return';
            await Notification.create({
                user: req.user._id,
                type: requestType === 'REPLACEMENT' ? 'replacement_request' : 'return_request',
                title: \`\${reqTypeStr} Requested #\${orderIdStr}\`,
                message: \`\${reqTypeStr} requested for order #\${orderIdStr} by \${userName}. Reason: \${updatedOrder.returnReason}\`,
                link: '/admin/returns',
                meta: { orderId: updatedOrder._id, orderNumber: updatedOrder.orderNumber }
            });
        } catch (notiErr) {
            console.error('Failed to create return notification:', notiErr.message);
        }`;

code = code.replace(searchNotification, replaceNotification);

fs.writeFileSync(file, code);
console.log('Fixed notification payload in backend');
