const fs = require('fs');
const file = 'D:/Ara Web/react-ecommerce/backend/controllers/orderController.js';
let code = fs.readFileSync(file, 'utf8');

const searchEmails = `                const settings = await Setting.findOne({});
                const siteName = settings?.websiteName || 'E-Commerce';
                const adminEmail = settings?.senderEmail || settings?.smtpUsername;
                const orderIdStr = updatedOrder.orderNumber || updatedOrder._id.toString().substring(0, 8).toUpperCase();

                // Admin Notification
                if (adminEmail) {
                    await sendEmail({
                        email: adminEmail,
                        subject: \`[\${siteName}] Return Requested #\${orderIdStr}\`,
                        message: \`Return requested for order #\${orderIdStr}. Reason: \${updatedOrder.returnReason}\`,
                        html: \`<div style="padding: 20px;">
                            <h2 style="color: #f59e0b;">Return Requested</h2>
                            <p>Customer has requested a return for order <strong>#\${orderIdStr}</strong>.</p>
                            <p><strong>Reason:</strong> \${updatedOrder.returnReason}</p>
                            <p>Please check the Admin Dashboard to arrange courier pickup.</p>
                        </div>\`
                    });
                }

                // Customer Notification
                if (req.user && req.user.email) {
                    await sendEmail({
                        email: req.user.email,
                        subject: \`[\${siteName}] Return Initiated #\${orderIdStr}\`,
                        message: \`Your return request for order #\${orderIdStr} has been received.\`,
                        html: \`<div style="padding: 20px;">
                            <h2 style="color: #f59e0b;">Return Initiated</h2>
                            <p>Hello \${req.user.name || 'Customer'},</p>
                            <p>We have successfully received your return request for order <strong>#\${orderIdStr}</strong>.</p>
                            <p>Our courier partner will contact you soon for the pickup.</p>
                        </div>\`
                    });
                }

                // SMS admin
                if (settings?.contactDetails?.phone) {
                    await sendSMS({
                        phone: settings.contactDetails.phone,
                        message: \`[\${siteName}] Return Request! ID: #\${orderIdStr}. Reason: \${updatedOrder.returnReason}\`
                    });
                }`;

const replaceEmails = `                const settings = await Setting.findOne({});
                const siteName = settings?.websiteName || 'E-Commerce';
                const adminEmail = settings?.senderEmail || settings?.smtpUsername;
                const orderIdStr = updatedOrder.orderNumber || updatedOrder._id.toString().substring(0, 8).toUpperCase();
                const reqTypeStr = requestType === 'REPLACEMENT' ? 'Replacement' : 'Return';

                // Admin Notification
                if (adminEmail) {
                    await sendEmail({
                        email: adminEmail,
                        subject: \`[\${siteName}] \${reqTypeStr} Requested #\${orderIdStr}\`,
                        message: \`\${reqTypeStr} requested for order #\${orderIdStr}. Reason: \${updatedOrder.returnReason}\`,
                        html: \`<div style="padding: 20px;">
                            <h2 style="color: \${requestType === 'REPLACEMENT' ? '#3b82f6' : '#f59e0b'};">\${reqTypeStr} Requested</h2>
                            <p>Customer has requested a \${reqTypeStr.toLowerCase()} for order <strong>#\${orderIdStr}</strong>.</p>
                            <p><strong>Reason:</strong> \${updatedOrder.returnReason}</p>
                            <p>Please check the Admin Dashboard to arrange courier pickup.</p>
                        </div>\`
                    });
                }

                // Customer Notification
                if (req.user && req.user.email) {
                    await sendEmail({
                        email: req.user.email,
                        subject: \`[\${siteName}] \${reqTypeStr} Initiated #\${orderIdStr}\`,
                        message: \`Your \${reqTypeStr.toLowerCase()} request for order #\${orderIdStr} has been received.\`,
                        html: \`<div style="padding: 20px;">
                            <h2 style="color: \${requestType === 'REPLACEMENT' ? '#3b82f6' : '#f59e0b'};">\${reqTypeStr} Initiated</h2>
                            <p>Hello \${req.user.name || 'Customer'},</p>
                            <p>We have successfully received your \${reqTypeStr.toLowerCase()} request for order <strong>#\${orderIdStr}</strong>.</p>
                            <p>Our courier partner will contact you soon for the pickup.</p>
                        </div>\`
                    });
                }

                // SMS admin
                if (settings?.contactDetails?.phone) {
                    await sendSMS({
                        phone: settings.contactDetails.phone,
                        message: \`[\${siteName}] \${reqTypeStr} Request! ID: #\${orderIdStr}. Reason: \${updatedOrder.returnReason}\`
                    });
                }`;

code = code.replace(searchEmails, replaceEmails);

fs.writeFileSync(file, code);
console.log('Fixed email payload in backend');
