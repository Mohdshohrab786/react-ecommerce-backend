const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    type: { 
        type: String, 
        enum: ['new_order', 'new_user', 'order_status', 'system', 'Email', 'SMS', 'WhatsApp', 'Push', 'InApp'], 
        default: 'InApp' 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    status: { type: String, enum: ['Pending', 'Sent', 'Failed'], default: 'Sent' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
