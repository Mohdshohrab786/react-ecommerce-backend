const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    // If order items were individual, we could reference them, but based on existing Order schema, 
    // it's an array of subdocuments. We can store order item name or _id. We'll store array of items.
    returnItems: [{
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }
    }],
    reason: { type: String, required: true },
    comment: { type: String },
    images: [{ type: String }], // Array of image URLs
    refundAmount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED', 'REFUND_PROCESSING', 'REFUNDED', 'CANCELLED'],
        default: 'REQUESTED'
    },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    completedAt: { type: Date },
    adminNotes: { type: String }
}, { timestamps: true });

const Return = mongoose.model('Return', returnSchema);
module.exports = Return;
