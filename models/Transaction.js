const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    type: { type: String, enum: ['Credit', 'Debit'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    reference: { type: mongoose.Schema.Types.ObjectId, refPath: 'referenceModel' },
    referenceModel: { type: String, enum: ['Order', 'Referral', 'Refund'] }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
