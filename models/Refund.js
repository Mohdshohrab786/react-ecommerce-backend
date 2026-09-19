const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    returnRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'Return' }, // Nullable if cancelled
    paymentId: { type: String }, // e.g. Razorpay payment ID or Wallet txn ID
    amount: { type: Number, required: true },
    type: { type: String, enum: ['CANCELLATION', 'RETURN', 'ADMIN_ADJUSTMENT'], required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED'], default: 'PENDING' },
    referenceId: { type: String, required: true, unique: true }, // e.g. REFUND-ORDER-12345
    reason: { type: String },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date }
}, { timestamps: true });

const Refund = mongoose.model('Refund', refundSchema);
module.exports = Refund;
