const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Setting = require('../models/Setting');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = async (req, res) => {
    const { 
        orderItems, 
        shippingAddress, 
        paymentMethod, 
        itemsPrice, 
        taxPrice, 
        shippingPrice, 
        shippingMethodName,
        totalPrice,
        coupon,
        discountAmount
    } = req.body;

    try {
        if (orderItems && orderItems.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        } else {
            const order = new Order({
                user: req.user._id,
                orderItems,
                shippingAddress,
                paymentMethod,
                itemsPrice,
                taxPrice,
                shippingPrice,
                shippingMethodName,
                totalPrice,
                coupon: coupon || undefined,
                discountAmount: discountAmount || 0
            });

            const createdOrder = await order.save();

            // If a coupon was used, increment its usedCount
            if (coupon) {
                await Coupon.findByIdAndUpdate(coupon, { $inc: { usedCount: 1 } });
            }

            // Send async notifications (without blocking the checkout response)
            setTimeout(async () => {
                try {
                    const settings = await Setting.findOne({});
                    const siteName = settings?.websiteName || 'E-Commerce';
                    const currency = settings?.currency || 'USD';

                    // 1. Email Admin (send directly to configured SMTP sender/username email)
                    const adminRecipientEmail = settings?.senderEmail || settings?.smtpUsername;
                    const itemsHtml = createdOrder.orderItems.map(item => `<li>${item.qty}x ${item.name} - ${currency} ${item.price}</li>`).join('');

                    console.log('--- STARTING ORDER EMAIL PROCESS ---');
                    console.log('Admin Email:', adminRecipientEmail);

                    if (adminRecipientEmail) {
                        console.log('Sending email to Admin...');
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
                                    <p>Please visit the Admin Dashboard to manage this order.</p>
                                </div>
                            `
                        });
                    }

                    // 2. Email Customer (user who placed the order)
                    console.log('Checking customer email for user:', req.user?.email);
                    if (req.user && req.user.email) {
                        let customerEmail = req.user.email;
                        if (customerEmail.includes('example.com')) {
                            // Redirect dummy testing emails to SMTP sender email so it does not bounce
                            customerEmail = settings?.senderEmail || settings?.smtpUsername || customerEmail;
                        }

                        console.log('Sending email to Customer:', customerEmail);
                        await sendEmail({
                            email: customerEmail,
                            subject: `[${siteName}] Order Confirmed! #${createdOrder._id.toString().substring(0, 8)}`,
                            message: `Your order ${createdOrder._id} for ${currency} ${createdOrder.totalPrice} is confirmed.`,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                    <h2 style="color: #f28b00;">Order Confirmed! 🎉</h2>
                                    <p>Hello ${req.user.name || 'Customer'},</p>
                                    <p>Thank you for shopping with <strong>${siteName}</strong>! We have received your order successfully.</p>
                                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                        <p><strong>Order ID:</strong> ${createdOrder._id}</p>
                                        <p><strong>Payment Method:</strong> ${createdOrder.paymentMethod}</p>
                                        <p><strong>Total Amount:</strong> ${currency} ${createdOrder.totalPrice}</p>
                                        <h4>Items Ordered:</h4>
                                        <ul>${itemsHtml}</ul>
                                    </div>
                                    <p>We will notify you once your order is shipped.</p>
                                    <p>Best regards,<br/>The ${siteName} Team</p>
                                </div>
                            `
                        });
                    }
                    console.log('--- ORDER EMAIL PROCESS COMPLETED SUCCESSFULLY ---');

                    // 3. SMS admin
                    if (settings?.contactDetails?.phone) {
                        await sendSMS({
                            phone: settings.contactDetails.phone,
                            message: `[${siteName}] New Order Booked! Order ID: ${createdOrder._id.toString().substring(0, 8)}, Total: ${currency} ${createdOrder.totalPrice}. Check Admin Dashboard.`
                        });
                    }
                } catch (notiErr) {
                    console.error('--- FAILED TO SEND ORDER NOTIFICATIONS ---');
                    console.error('Error Details:', notiErr);
                }
            }, 100);

            res.status(201).json(createdOrder);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');
        if (order) {
            res.json(order);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            order.isPaid = true;
            order.paidAt = Date.now();
            // Simulating payment details for now
            order.paymentResult = {
                id: 'simulated_id',
                status: 'completed',
                update_time: new Date().toISOString(),
                email_address: req.user.email
            };

            const updatedOrder = await order.save();

            // Create transaction ledger record
            try {
                let wallet = await Wallet.findOne({ user: order.user });
                if (!wallet) {
                    wallet = await Wallet.create({ user: order.user, balance: 0 });
                }
                await Transaction.create({
                    wallet: wallet._id,
                    type: 'Credit',
                    amount: order.totalPrice,
                    description: `Payment received for Order #${order._id.toString().substring(0, 8)} (${order.paymentMethod || 'Online'})`,
                    reference: order._id,
                    referenceModel: 'Order'
                });
            } catch (txnError) {
                console.error('Failed to create transaction record:', txnError.message);
            }

            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            order.isDelivered = true;
            order.deliveredAt = Date.now();

            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update order status generically (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        const { status } = req.body;

        if (order) {
            order.status = status;

            // Handle side effects of specific statuses
            if (status === 'Delivered') {
                if (!order.isDelivered) {
                    order.isDelivered = true;
                    order.deliveredAt = Date.now();
                }
            } else {
                // If it's no longer delivered
                order.isDelivered = false;
                order.deliveredAt = undefined;
            }

            // In real app, changing status might also trigger emails (e.g. Shipped)
            
            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({}).populate('user', 'id name').sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Razorpay Order
// @route   POST /api/orders/:id/create-razorpay-order
// @access  Private
const createRazorpayOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const settings = await Setting.findOne({});
        if (!settings || !settings.razorpayKeyId || !settings.razorpayKeySecret) {
            return res.status(400).json({ message: 'Razorpay keys not configured in admin settings' });
        }

        const instance = new Razorpay({
            key_id: settings.razorpayKeyId,
            key_secret: settings.razorpayKeySecret,
        });

        const options = {
            amount: Math.round(order.totalPrice * 100), // amount in smallest currency unit (e.g. paise)
            currency: settings.currency || "USD",
            receipt: `receipt_order_${order._id}`,
        };

        const razorpayOrder = await instance.orders.create(options);
        if (!razorpayOrder) {
            return res.status(500).json({ message: 'Error creating Razorpay order' });
        }

        res.json(razorpayOrder);
    } catch (error) {
        console.error('Razorpay Order Create Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/orders/:id/verify-razorpay-payment
// @access  Private
const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        const settings = await Setting.findOne({});
        if (!settings || !settings.razorpayKeySecret) {
            return res.status(400).json({ message: 'Razorpay keys not configured' });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", settings.razorpayKeySecret)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Payment is verified
            const order = await Order.findById(req.params.id);
            if (order) {
                order.isPaid = true;
                order.paidAt = Date.now();
                // Update the payment method to reflect the online payment if it was COD
                order.paymentMethod = 'Razorpay';
                order.paymentResult = {
                    id: razorpay_payment_id,
                    status: 'verified',
                    update_time: new Date().toISOString(),
                    email_address: req.user.email
                };

                const updatedOrder = await order.save();

                // Create transaction ledger record
                try {
                    let wallet = await Wallet.findOne({ user: order.user });
                    if (!wallet) {
                        wallet = await Wallet.create({ user: order.user, balance: 0 });
                    }
                    await Transaction.create({
                        wallet: wallet._id,
                        type: 'Credit',
                        amount: order.totalPrice,
                        description: `Payment received for Order #${order._id.toString().substring(0, 8)} (Razorpay: ${razorpay_payment_id})`,
                        reference: order._id,
                        referenceModel: 'Order'
                    });
                } catch (txnError) {
                    console.error('Failed to create transaction record:', txnError.message);
                }

                return res.json({ message: "Payment verified successfully", order: updatedOrder });
            } else {
                return res.status(404).json({ message: 'Order not found' });
            }
        } else {
            return res.status(400).json({ message: "Invalid signature sent!" });
        }
    } catch (error) {
        console.error('Razorpay Verify Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    addOrderItems, 
    getOrderById, 
    updateOrderToPaid, 
    updateOrderToDelivered, 
    updateOrderStatus,
    getMyOrders, 
    getOrders,
    createRazorpayOrder,
    verifyRazorpayPayment
};
