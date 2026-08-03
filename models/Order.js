const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    orderItems: [
        {
            name: { type: String, required: true },
            qty: { type: Number, required: true },
            image: { type: String, required: true },
            price: { type: Number, required: true },
            product: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: 'Product'
            }
        }
    ],
    shippingAddress: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
        state: { type: String, required: true },
        phone: { type: String, required: true }
    },
    paymentMethod: { type: String, required: true },
    paymentResult: {
        id: { type: String },
        status: { type: String },
        update_time: { type: String },
        email_address: { type: String }
    },
    itemsPrice: { type: Number, required: true, default: 0.0 },
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    shippingMethodName: { type: String },
    totalPrice: { type: Number, required: true, default: 0.0 },
    
    // Payment info
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    
    // Status Flow
    status: { 
        type: String, 
        enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Refunded'],
        default: 'Pending'
    },
    
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },
    
    // Tracking & Invoice
    trackingNumber: { type: String },
    invoiceUrl: { type: String },
    
    // Coupon applied
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    discountAmount: { type: Number, default: 0 }
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
