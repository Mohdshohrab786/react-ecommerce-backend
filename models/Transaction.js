const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    refund: { type: mongoose.Schema.Types.ObjectId, ref: 'Refund' },
    returnRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'Return' },
    
    type: { 
        type: String, 
        enum: [
            'REFUND', 
            'ORDER_PAYMENT', 
            'WALLET_PAYMENT', 
            'WALLET_CREDIT', 
            'WALLET_DEBIT', 
            'MANUAL_CREDIT', 
            'MANUAL_DEBIT', 
            'REVERSAL', 
            'REFUND_REVERSAL',
            'Credit', // legacy support
            'Debit' // legacy support
        ], 
        required: true 
    },
    amount: { type: Number, required: true },
    direction: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    
    referenceId: { type: String, required: true, unique: true }, // e.g. WLT-REF-ORD-1001
    description: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'COMPLETED' },
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
