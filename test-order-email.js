require('dotenv').config();
const mongoose = require('mongoose');
const Setting = require('./models/Setting');
const Order = require('./models/Order');
const sendEmail = require('./utils/sendEmail');

async function testOrderEmail() {
    console.log('Connecting to Atlas...');
    await mongoose.connect('mongodb+srv://ecommerc_db_user:ecommerc_db_user@cluster0.ohy9wpx.mongodb.net/?appName=Cluster0');
    console.log('Connected. Fetching last order...');
    
    const createdOrder = await Order.findOne().sort({ createdAt: -1 });
    if (!createdOrder) {
        console.log('No orders found.');
        process.exit(1);
    }
    console.log('Found order:', createdOrder._id);

    try {
        const settings = await Setting.findOne({});
        const siteName = settings?.websiteName || 'E-Commerce';
        const currency = settings?.currency || 'USD';

        // 1. Email Admin
        const adminRecipientEmail = settings?.senderEmail || settings?.smtpUsername;
        const itemsHtml = createdOrder.orderItems.map(item => `<li>${item.qty}x ${item.name} - ${currency} ${item.price}</li>`).join('');

        console.log('Admin email:', adminRecipientEmail);
        
        if (adminRecipientEmail) {
            console.log('Sending admin email...');
            await sendEmail({
                email: adminRecipientEmail,
                subject: `[${siteName}] New Order Booked #${createdOrder._id.toString().substring(0, 8)}`,
                message: `New order ${createdOrder._id} for ${currency} ${createdOrder.totalPrice}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #f28b00;">New Order Received!</h2>
                        <p>Hello Admin,</p>
                        <p>A new order has been placed on <strong>${siteName}</strong>.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Order ID:</strong> ${createdOrder._id}</p>
                            <p><strong>Payment Method:</strong> ${createdOrder.paymentMethod}</p>
                            <p><strong>Total Amount:</strong> ${currency} ${createdOrder.totalPrice}</p>
                            <h4>Items Ordered:</h4>
                            <ul>${itemsHtml}</ul>
                        </div>
                    </div>
                `
            });
            console.log('Admin email sent successfully.');
        }

        // 2. Email Customer (Simulating user email)
        const customerEmail = 'shohrab0000@gmail.com'; // Hardcoding for test
        console.log('Sending customer email to', customerEmail, '...');
        
        await sendEmail({
            email: customerEmail,
            subject: `[${siteName}] Order Confirmed! #${createdOrder._id.toString().substring(0, 8)}`,
            message: `Your order ${createdOrder._id} for ${currency} ${createdOrder.totalPrice} is confirmed.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #f28b00;">Order Confirmed! 🎉</h2>
                    <p>Hello Customer,</p>
                    <p>Thank you for shopping with <strong>${siteName}</strong>! We have received your order successfully.</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Order ID:</strong> ${createdOrder._id}</p>
                        <p><strong>Payment Method:</strong> ${createdOrder.paymentMethod}</p>
                        <p><strong>Total Amount:</strong> ${currency} ${createdOrder.totalPrice}</p>
                        <h4>Items Ordered:</h4>
                        <ul>${itemsHtml}</ul>
                    </div>
                </div>
            `
        });
        console.log('Customer email sent successfully.');

    } catch (error) {
        console.error('Failed to send order notifications:', error);
    }
    process.exit(0);
}

testOrderEmail();
