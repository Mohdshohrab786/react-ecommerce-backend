const mongoose = require('mongoose');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const Coupon = require('../models/Coupon');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Refund = require('../models/Refund');
const Return = require('../models/Return');
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
            // Generate clean short unique order number e.g. ORD-749281
            let orderNumber;
            let isUnique = false;
            while (!isUnique) {
                const randomDigits = Math.floor(100000 + Math.random() * 900000);
                orderNumber = `ORD-${randomDigits}`;
                const exists = await Order.findOne({ orderNumber });
                if (!exists) isUnique = true;
            }

            const Product = require('../models/Product');
            
            // Enrich order items with current product return policies
            const enrichedOrderItems = await Promise.all(orderItems.map(async (item) => {
                const product = await Product.findById(item.product);
                return {
                    ...item,
                    isReturnable: product ? product.isReturnable : true,
                    isReplaceable: product ? product.isReplaceable : true,
                    returnDays: product ? product.returnDays : 7
                };
            }));

            const order = new Order({
                user: req.user._id,
                orderItems: enrichedOrderItems,
                shippingAddress,
                paymentMethod,
                itemsPrice,
                taxPrice,
                shippingPrice,
                shippingMethodName,
                totalPrice,
                coupon: coupon || undefined,
                discountAmount: discountAmount || 0,
                orderNumber
            });

            const createdOrder = await order.save();

            // Trigger admin notification for new order
            try {
                const settings = await Setting.findOne({});
                const currency = settings?.currency || 'USD';
                const userName = req.user?.name || 'Customer';
                const itemsCount = createdOrder.orderItems?.length || 0;
                const displayId = createdOrder.orderNumber || createdOrder._id.toString().substring(0, 8).toUpperCase();

                await Notification.create({
                    user: req.user._id,
                    type: 'new_order',
                    title: `New Order #${displayId}`,
                    message: `New order #${displayId} of ${currency} ${createdOrder.totalPrice} (${itemsCount} items) placed by ${userName} via ${createdOrder.paymentMethod}.`,
                    link: '/admin/orderlist',
                    meta: { 
                        orderId: createdOrder._id, 
                        orderNumber: createdOrder.orderNumber,
                        totalPrice: createdOrder.totalPrice, 
                        paymentMethod: createdOrder.paymentMethod,
                        itemsCount 
                    }
                });
            } catch (notiErr) {
                console.error('Failed to create new_order notification:', notiErr.message);
            }

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
                    const orderDisplayId = createdOrder.orderNumber || createdOrder._id.toString().substring(0, 8).toUpperCase();

                    console.log('--- STARTING ORDER EMAIL PROCESS ---');
                    console.log('Admin Email:', adminRecipientEmail);

                    if (adminRecipientEmail) {
                        console.log('Sending email to Admin...');
                        await sendEmail({
                            email: adminRecipientEmail,
                            subject: `[${siteName}] New Order Booked #${orderDisplayId}`,
                            message: `New order #${orderDisplayId} for ${currency} ${createdOrder.totalPrice}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                    <h2 style="color: #6366f1;">New Order Received!</h2>
                                    <p>Hello Admin,</p>
                                    <p>A new order has been placed on <strong>${siteName}</strong>.</p>
                                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                        <p><strong>Order ID:</strong> #${orderDisplayId}</p>
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
                            subject: `[${siteName}] Order Confirmed! #${orderDisplayId}`,
                            message: `Your order #${orderDisplayId} for ${currency} ${createdOrder.totalPrice} is confirmed.`,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                    <h2 style="color: #6366f1;">Order Confirmed! 🎉</h2>
                                    <p>Hello ${req.user.name || 'Customer'},</p>
                                    <p>Thank you for shopping with <strong>${siteName}</strong>! We have received your order successfully.</p>
                                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                        <p><strong>Order ID:</strong> #${orderDisplayId}</p>
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
                            message: `[${siteName}] New Order Booked! Order ID: #${orderDisplayId}, Total: ${currency} ${createdOrder.totalPrice}. Check Admin Dashboard.`
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
        const id = req.params.id;
        let order;
        if (mongoose.Types.ObjectId.isValid(id)) {
            order = await Order.findById(id).populate('user', 'name email');
        }
        if (!order) {
            order = await Order.findOne({ orderNumber: id }).populate('user', 'name email');
        }
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
            order.status = 'Delivered';
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
// @desc    Cancel an order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        const { reason } = req.body;

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Ensure only the user who made the order or an admin can cancel
        if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(401).json({ message: 'Not authorized to cancel this order' });
        }

        // Only allow cancellation if order is not shipped or delivered
        if (order.status === 'Shipped' || order.status === 'Delivered' || order.status === 'OutForDelivery') {
            return res.status(400).json({ message: 'Cannot cancel an order that is already shipped or delivered' });
        }

        
        order.status = 'Cancelled';
        order.cancellationReason = reason || 'Cancelled by customer';
        
        let refundProcessed = false;
        // Refund logic
        if (order.isPaid || order.totalPaid > 0) {
            const amountToRefund = order.totalPaid > 0 ? order.totalPaid : order.totalPrice;
            const settings = await Setting.findOne();
            
            // Generate unique reference
            const refundRef = `REFUND-CANC-${order._id}-${Date.now()}`;
            
            // Check for duplicate refund
            const existingRefund = await Refund.findOne({ order: order._id, status: 'COMPLETED' });
            if (!existingRefund) {
                const refund = new Refund({
                    user: order.user,
                    order: order._id,
                    amount: amountToRefund,
                    type: 'CANCELLATION',
                    status: settings.isRefundToWalletEnabled ? 'COMPLETED' : 'PENDING',
                    referenceId: refundRef,
                    reason: order.cancellationReason
                });
                
                if (settings.isRefundToWalletEnabled) {
                    let wallet = await Wallet.findOne({ user: order.user });
                    if (!wallet) {
                        wallet = new Wallet({ user: order.user, balance: 0, totalCredited: 0, totalDebited: 0 });
                    }
                    const balBefore = wallet.balance;
                    wallet.balance += amountToRefund;
                    wallet.totalCredited += amountToRefund;
                    await wallet.save();
                    
                    await Transaction.create({
                        wallet: wallet._id,
                        user: order.user,
                        order: order._id,
                        refund: refund._id,
                        type: 'REFUND',
                        amount: amountToRefund,
                        direction: 'CREDIT',
                        balanceBefore: balBefore,
                        balanceAfter: wallet.balance,
                        referenceId: `WLT-${refundRef}`,
                        description: `Refund for cancelled order #${order.orderNumber || order._id.toString().substring(0,8)}`,
                        status: 'COMPLETED'
                    });
                    
                    refund.paymentId = `WLT-${refundRef}`;
                    refundProcessed = true;
                }
                
                await refund.save();
            }
        }

        
        const updatedOrder = await order.save();
        const orderIdStr = updatedOrder.orderNumber || updatedOrder._id.toString().substring(0, 8).toUpperCase();

        // Admin Dashboard Notification
        try {
            const Notification = require('../models/Notification');
            const userName = req.user?.name || 'Customer';
            await Notification.create({
                user: req.user._id,
                type: 'order_cancelled',
                title: `Order Cancelled #${orderIdStr}`,
                message: `Order #${orderIdStr} was cancelled by ${userName}. Reason: ${updatedOrder.cancellationReason}`,
                link: '/admin/orderlist',
                meta: { orderId: updatedOrder._id, orderNumber: updatedOrder.orderNumber }
            });
        } catch (notiErr) {
            console.error('Failed to create cancel notification:', notiErr.message);
        }
        
        // Notifications
        setTimeout(async () => {
            try {
                const Setting = require('../models/Setting');
                const sendEmail = require('../utils/sendEmail');
                const sendSMS = require('../utils/sendSMS');
                
                const settings = await Setting.findOne({});
                const siteName = settings?.websiteName || 'E-Commerce';
                const adminEmail = settings?.senderEmail || settings?.smtpUsername;
                const orderIdStr = updatedOrder.orderNumber || updatedOrder._id.toString().substring(0, 8).toUpperCase();

                // Admin Notification
                if (adminEmail) {
                    await sendEmail({
                        email: adminEmail,
                        subject: `[${siteName}] Order Cancelled #${orderIdStr}`,
                        message: `Order #${orderIdStr} has been cancelled by the customer. Reason: ${updatedOrder.cancellationReason}`,
                        html: `<div style="padding: 20px;">
                            <h2 style="color: #ef4444;">Order Cancelled</h2>
                            <p>Customer has cancelled order <strong>#${orderIdStr}</strong>.</p>
                            <p><strong>Reason:</strong> ${updatedOrder.cancellationReason}</p>
                        </div>`
                    });
                }

                // Customer Notification
                if (req.user && req.user.email) {
                    await sendEmail({
                        email: req.user.email,
                        subject: `[${siteName}] Order Cancelled #${orderIdStr}`,
                        message: `Your order #${orderIdStr} has been successfully cancelled.`,
                        html: `<div style="padding: 20px;">
                            <h2 style="color: #ef4444;">Order Cancelled</h2>
                            <p>Hello ${req.user.name || 'Customer'},</p>
                            <p>Your order <strong>#${orderIdStr}</strong> has been cancelled successfully as requested.</p>
                            <p>If you have already paid, your refund will be processed soon.</p>
                        </div>`
                    });
                }

                // SMS admin
                if (settings?.contactDetails?.phone) {
                    await sendSMS({
                        phone: settings.contactDetails.phone,
                        message: `[${siteName}] Order Cancelled! ID: #${orderIdStr}. Reason: ${updatedOrder.cancellationReason}`
                    });
                }
            } catch (err) {
                console.error('Failed to send cancellation emails:', err.message);
            }
        }, 100);

        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Request return for an order
// @route   PUT /api/orders/:id/return
// @access  Private
const returnOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        const { returnReason, requestType, returnItems: reqReturnItems } = req.body;

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(401).json({ message: 'Not authorized to return this order' });
        }

        if (!order.isDelivered || order.status !== 'Delivered') {
            return res.status(400).json({ message: 'Only delivered orders can be returned' });
        }

        order.status = requestType === 'REPLACEMENT' ? 'Replacement Requested' : 'Returned';
        order.returnReason = `[${requestType || 'RETURN'}] ${returnReason || 'Requested by customer'}`;
        order.returnRequestDate = Date.now();

        let returnItems = [];
        let refundAmount = 0;

        if (reqReturnItems && Array.isArray(reqReturnItems) && reqReturnItems.length > 0) {
            reqReturnItems.forEach(reqItem => {
                const orderItem = order.orderItems.find(item => item.product.toString() === reqItem.product.toString());
                if (orderItem) {
                    const qty = Math.min(reqItem.qty || 1, orderItem.qty);
                    returnItems.push({
                        name: orderItem.name,
                        qty: qty,
                        price: orderItem.price,
                        product: orderItem.product
                    });
                    refundAmount += (orderItem.price * qty);
                }
            });
        } else {
            returnItems = order.orderItems.map(item => ({
                name: item.name,
                qty: item.qty,
                price: item.price,
                product: item.product
            }));
            refundAmount = order.totalPaid > 0 ? order.totalPaid : order.totalPrice;
        }

        if (returnItems.length === 0) {
            return res.status(400).json({ message: 'No valid items to return' });
        }

        const newReturn = new Return({
            user: order.user,
            order: order._id,
            returnItems,
            reason: order.returnReason,
            refundAmount: refundAmount,
            status: 'REQUESTED'
        });
        await newReturn.save();
 // Optionally mark isDelivered false, or leave it true but status Returned. Let's leave it false to match hierarchy.

        const updatedOrder = await order.save();
        const orderIdStr = updatedOrder.orderNumber || updatedOrder._id.toString().substring(0, 8).toUpperCase();

        // Admin Dashboard Notification
        try {
            const Notification = require('../models/Notification');
            const userName = req.user?.name || 'Customer';
            const reqTypeStr = requestType === 'REPLACEMENT' ? 'Replacement' : 'Return';
            await Notification.create({
                user: req.user._id,
                type: requestType === 'REPLACEMENT' ? 'replacement_request' : 'return_request',
                title: `${reqTypeStr} Requested #${orderIdStr}`,
                message: `${reqTypeStr} requested for order #${orderIdStr} by ${userName}. Reason: ${updatedOrder.returnReason}`,
                link: '/admin/returns',
                meta: { orderId: updatedOrder._id, orderNumber: updatedOrder.orderNumber }
            });
        } catch (notiErr) {
            console.error('Failed to create return notification:', notiErr.message);
        }
        
        // Notifications
        setTimeout(async () => {
            try {
                const Setting = require('../models/Setting');
                const sendEmail = require('../utils/sendEmail');
                const sendSMS = require('../utils/sendSMS');
                
                const settings = await Setting.findOne({});
                const siteName = settings?.websiteName || 'E-Commerce';
                const adminEmail = settings?.senderEmail || settings?.smtpUsername;
                const orderIdStr = updatedOrder.orderNumber || updatedOrder._id.toString().substring(0, 8).toUpperCase();
                const reqTypeStr = requestType === 'REPLACEMENT' ? 'Replacement' : 'Return';

                // Admin Notification
                if (adminEmail) {
                    await sendEmail({
                        email: adminEmail,
                        subject: `[${siteName}] ${reqTypeStr} Requested #${orderIdStr}`,
                        message: `${reqTypeStr} requested for order #${orderIdStr}. Reason: ${updatedOrder.returnReason}`,
                        html: `<div style="padding: 20px;">
                            <h2 style="color: ${requestType === 'REPLACEMENT' ? '#3b82f6' : '#f59e0b'};">${reqTypeStr} Requested</h2>
                            <p>Customer has requested a ${reqTypeStr.toLowerCase()} for order <strong>#${orderIdStr}</strong>.</p>
                            <p><strong>Reason:</strong> ${updatedOrder.returnReason}</p>
                            <p>Please check the Admin Dashboard to arrange courier pickup.</p>
                        </div>`
                    });
                }

                // Customer Notification
                if (req.user && req.user.email) {
                    await sendEmail({
                        email: req.user.email,
                        subject: `[${siteName}] ${reqTypeStr} Initiated #${orderIdStr}`,
                        message: `Your ${reqTypeStr.toLowerCase()} request for order #${orderIdStr} has been received.`,
                        html: `<div style="padding: 20px;">
                            <h2 style="color: ${requestType === 'REPLACEMENT' ? '#3b82f6' : '#f59e0b'};">${reqTypeStr} Initiated</h2>
                            <p>Hello ${req.user.name || 'Customer'},</p>
                            <p>We have successfully received your ${reqTypeStr.toLowerCase()} request for order <strong>#${orderIdStr}</strong>.</p>
                            <p>Our courier partner will contact you soon for the pickup.</p>
                        </div>`
                    });
                }

                // SMS admin
                if (settings?.contactDetails?.phone) {
                    await sendSMS({
                        phone: settings.contactDetails.phone,
                        message: `[${siteName}] ${reqTypeStr} Request! ID: #${orderIdStr}. Reason: ${updatedOrder.returnReason}`
                    });
                }
            } catch (err) {
                console.error('Failed to send return emails:', err.message);
            }
        }, 100);

        res.json(updatedOrder);
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
        const orders = await Order.find({}).populate('user', 'id name email phone').sort({ createdAt: -1 });
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
        const { walletAmountUsed } = req.body || {};
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const settings = await Setting.findOne({});
        if (!settings || !settings.razorpayKeyId || !settings.razorpayKeySecret) {
            return res.status(400).json({ message: 'Razorpay keys not configured in admin settings' });
        }
        
        let payableAmount = order.totalPrice;
        if (walletAmountUsed > 0 && settings.isMixedPaymentEnabled) {
            payableAmount = order.totalPrice - walletAmountUsed;
        }

        const instance = new Razorpay({
            key_id: settings.razorpayKeyId,
            key_secret: settings.razorpayKeySecret,
        });

        const options = {
            amount: Math.round(payableAmount * 100), // amount in smallest currency unit (e.g. paise)
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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, walletAmountUsed } = req.body;
        
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
            const order = await Order.findById(req.params.id);
            if (order) {
                let walletDeducted = 0;
                
                // If user used wallet for mixed payment
                if (walletAmountUsed > 0 && settings.isMixedPaymentEnabled) {
                    const wallet = await Wallet.findOne({ user: order.user });
                    if (wallet && wallet.balance >= walletAmountUsed) {
                        const balBefore = wallet.balance;
                        wallet.balance -= walletAmountUsed;
                        wallet.totalDebited += walletAmountUsed;
                        await wallet.save();
                        walletDeducted = walletAmountUsed;
                        
                        await Transaction.create({
                            wallet: wallet._id,
                            user: order.user,
                            order: order._id,
                            type: 'WALLET_PAYMENT',
                            amount: walletAmountUsed,
                            direction: 'DEBIT',
                            balanceBefore: balBefore,
                            balanceAfter: wallet.balance,
                            referenceId: `WLT-PAY-MIX-${order._id}-${Date.now()}`,
                            description: `Partial Wallet payment for Order #${order.orderNumber || order._id.toString().substring(0, 8)}`,
                            status: 'COMPLETED'
                        });
                    }
                }
                
                order.isPaid = true;
                order.paidAt = Date.now();
                order.paymentMethod = walletDeducted > 0 ? 'Wallet + Razorpay' : 'Razorpay';
                order.walletAmount = walletDeducted;
                order.onlineAmount = order.totalPrice - walletDeducted;
                order.totalPaid = order.totalPrice;
                
                order.paymentResult = {
                    id: razorpay_payment_id,
                    status: 'verified',
                    update_time: new Date().toISOString(),
                    email_address: req.user.email
                };

                const updatedOrder = await order.save();

                // Create transaction ledger record for the online part
                try {
                    let wallet = await Wallet.findOne({ user: order.user });
                    if (!wallet) {
                        wallet = await Wallet.create({ user: order.user, balance: 0, totalCredited: 0, totalDebited: 0 });
                    }
                    
                    if (order.onlineAmount > 0) {
                        // The online amount is paid to the store, we just record it in order, 
                        // optionally as a wallet passthrough if needed, but the prompt says 
                        // "Create ONE refund transaction... prevent duplicate accounting".
                        // So we won't put online payments into the wallet ledger unless it's a deposit.
                        // We'll log it as ORDER_PAYMENT but without balance change to wallet? 
                        // Actually, standard e-commerce: wallet transactions only for wallet changes.
                    }
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

// @desc    Delete single order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (order) {
            return res.json({ message: 'Order removed successfully' });
        } else {
            return res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk delete multiple orders
// @route   POST /api/orders/bulk-delete
// @access  Private/Admin
const bulkDeleteOrders = async (req, res) => {
    try {
        const { orderIds } = req.body;
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ message: 'Please select at least one order to delete.' });
        }

        const result = await Order.deleteMany({ _id: { $in: orderIds } });
        res.json({ 
            message: `${result.deletedCount} order(s) deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export all orders as formatted CSV directly from DB
// @route   GET /api/orders/export/csv
// @access  Private/Admin
const exportOrdersCSV = async (req, res) => {
    try {
        const orders = await Order.find({}).populate('user', 'name email phone').sort({ createdAt: -1 });
        
        const headers = [
            'Order ID',
            'Order Date',
            'Customer Name',
            'Customer Email',
            'Customer Phone',
            'Shipping Address',
            'City',
            'State',
            'Postal Code',
            'Payment Method',
            'Payment Status',
            'Paid At',
            'Delivery Status',
            'Delivered At',
            'Items Ordered Summary',
            'Total Items Qty',
            'Items Subtotal',
            'Shipping Fee',
            'Discount Amount',
            'Grand Total (INR)'
        ];

        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = orders.map(order => {
            const orderId = order.orderNumber ? `#${order.orderNumber}` : `#${order._id.toString().substring(0, 8).toUpperCase()}`;
            const orderDate = new Date(order.createdAt).toLocaleString('en-IN');
            const custName = order.user?.name || order.shippingAddress?.name || 'Customer';
            const custEmail = order.user?.email || 'N/A';
            const custPhone = order.shippingAddress?.phone || order.user?.phone || 'N/A';
            const address = order.shippingAddress?.address || 'N/A';
            const city = order.shippingAddress?.city || 'N/A';
            const state = order.shippingAddress?.state || 'N/A';
            const postalCode = order.shippingAddress?.postalCode || 'N/A';
            const paymentMethod = order.paymentMethod || 'Online';
            const paymentStatus = order.isPaid ? 'PAID' : 'UNPAID';
            const paidAt = order.paidAt ? new Date(order.paidAt).toLocaleString('en-IN') : 'N/A';
            const deliveryStatus = order.status || (order.isDelivered ? 'Delivered' : 'Pending');
            const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('en-IN') : 'N/A';

            const itemsStr = order.orderItems?.map(i => `${i.name} (x${i.qty} @ ${i.price})`).join('; ') || 'N/A';
            const totalQty = order.orderItems?.reduce((acc, i) => acc + (Number(i.qty) || 1), 0) || 0;
            const itemsPrice = order.itemsPrice || 0;
            const shippingPrice = order.shippingPrice || 0;
            const discountPrice = order.discountPrice || 0;
            const grandTotal = order.totalPrice || 0;

            return [
                escapeCSV(orderId),
                escapeCSV(orderDate),
                escapeCSV(custName),
                escapeCSV(custEmail),
                escapeCSV(custPhone),
                escapeCSV(address),
                escapeCSV(city),
                escapeCSV(state),
                escapeCSV(postalCode),
                escapeCSV(paymentMethod),
                escapeCSV(paymentStatus),
                escapeCSV(paidAt),
                escapeCSV(deliveryStatus),
                escapeCSV(deliveredAt),
                escapeCSV(itemsStr),
                totalQty,
                itemsPrice.toFixed(2),
                shippingPrice.toFixed(2),
                discountPrice.toFixed(2),
                grandTotal.toFixed(2)
            ].join(',');
        });

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `shahi_store_all_orders_${timestamp}.csv`;

        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csvContent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Check cancellation eligibility
// @route   GET /api/orders/:id/cancellation-eligibility
// @access  Private
const getCancellationEligibility = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        const settings = await Setting.findOne();
        if (settings && !settings.isCancellationEnabled) {
            return res.json({ canCancel: false, reason: 'Cancellation is currently disabled' });
        }
        
        if (order.status === 'Cancelled') return res.json({ canCancel: false, reason: 'Order is already cancelled' });
        if (['Shipped', 'OutForDelivery', 'Delivered', 'Returned', 'Replacement Requested'].includes(order.status)) {
            return res.json({ canCancel: false, reason: 'Order cannot be cancelled at this stage' });
        }
        
        return res.json({ canCancel: true, reason: null });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check return eligibility
// @route   GET /api/orders/:id/return-eligibility
// @access  Private
const getReturnEligibility = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        const settings = await Setting.findOne();
        if (settings && !settings.isReturnsEnabled) {
            return res.json({ canReturn: false, reason: 'Returns are currently disabled', itemsEligibility: [] });
        }
        
        if (!order.isDelivered) {
            return res.json({ canReturn: false, reason: 'Order is not delivered yet', itemsEligibility: [] });
        }
    
        const existingReturn = await Return.findOne({ order: order._id, status: { $ne: 'CANCELLED' } });
        if (existingReturn) {
            return res.json({ canReturn: false, reason: 'Return already requested', return: existingReturn, itemsEligibility: [] });
        }
        
        const deliveredDate = new Date(order.deliveredAt || order.updatedAt);
        
        const itemsEligibility = order.orderItems.map(item => {
            const isRet = item.isReturnable !== undefined ? item.isReturnable : true;
            const isRep = item.isReplaceable !== undefined ? item.isReplaceable : true;
            const days = item.returnDays !== undefined ? item.returnDays : ((settings && settings.returnWindowDays) || 7);
            
            const deadline = new Date(deliveredDate);
            deadline.setDate(deadline.getDate() + days);
            const expired = new Date() > deadline;
            
            return {
                product: item.product,
                name: item.name,
                canReturn: isRet && !expired,
                canReplace: isRep && !expired,
                reason: expired ? 'Window expired' : (!isRet && !isRep ? 'Non-returnable item' : null),
                deadline
            };
        });
        
        const canReturnAny = itemsEligibility.some(item => item.canReturn || item.canReplace);
        
        return res.json({ 
            canReturn: canReturnAny, 
            reason: canReturnAny ? null : 'No items are eligible for return/replace', 
            itemsEligibility 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Pay order fully with wallet
// @route   POST /api/orders/:id/pay-with-wallet
// @access  Private
const payWithWallet = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        if (order.isPaid) {
            return res.status(400).json({ message: 'Order is already paid' });
        }
        
        const settings = await Setting.findOne();
        if (settings && !settings.isWalletPaymentEnabled) {
            return res.status(400).json({ message: 'Wallet payments are disabled' });
        }
        
        const wallet = await Wallet.findOne({ user: req.user._id });
        if (!wallet || wallet.balance < order.totalPrice) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
        }
        
        // Deduct from wallet
        const balBefore = wallet.balance;
        wallet.balance -= order.totalPrice;
        wallet.totalDebited += order.totalPrice;
        await wallet.save();
        
        // Create transaction
        const refId = `WLT-PAY-ORD-${order._id}-${Date.now()}`;
        await Transaction.create({
            wallet: wallet._id,
            user: req.user._id,
            order: order._id,
            type: 'WALLET_PAYMENT',
            amount: order.totalPrice,
            direction: 'DEBIT',
            balanceBefore: balBefore,
            balanceAfter: wallet.balance,
            referenceId: refId,
            description: `Paid for order #${order.orderNumber || order._id.toString().substring(0,8)} using Wallet`,
            status: 'COMPLETED'
        });
        
        // Mark order paid
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentMethod = 'Wallet';
        order.walletAmount = order.totalPrice;
        order.onlineAmount = 0;
        order.totalPaid = order.totalPrice;
        order.paymentResult = {
            id: refId,
            status: 'completed',
            update_time: new Date().toISOString(),
            email_address: req.user.email
        };
        
        const updatedOrder = await order.save();
        return res.json({ message: 'Payment successful using Wallet', order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    payWithWallet, 
    getCancellationEligibility,
    getReturnEligibility, 
    addOrderItems, 
    getOrderById, 
    updateOrderToPaid, 
    updateOrderToDelivered, 
    updateOrderStatus,
    cancelOrder,
    returnOrder,
    getMyOrders, 
    getOrders,
    deleteOrder,
    bulkDeleteOrders,
    exportOrdersCSV,
    createRazorpayOrder,
    verifyRazorpayPayment
};
