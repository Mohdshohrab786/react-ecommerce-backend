const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    // Website Settings
    websiteName: { type: String, default: 'E-Commerce' },
    logo: { type: String, default: '/images/logo.png' },
    favicon: { type: String },
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    gstPercentage: { type: Number, default: 0 },
    socialLinks: { type: Object, default: {} },
    contactDetails: { type: Object, default: {} },
    
    // SMTP
    smtpHost: { type: String },
    smtpPort: { type: String },
    smtpUsername: { type: String },
    smtpPassword: { type: String },
    senderEmail: { type: String },
    
    // Twilio
    twilioAccountSid: { type: String },
    twilioAuthToken: { type: String },
    twilioNumber: { type: String },
    isOtpLoginEnabled: { type: Boolean, default: false },
    
    // Payment Gateway Settings
    activePaymentGateway: { type: String, default: 'None', enum: ['None', 'Razorpay', 'PhonePe', 'Cashfree'] },
    isCodEnabled: { type: Boolean, default: true },
    razorpayKeyId: { type: String },
    razorpayKeySecret: { type: String },
    razorpayEnvironment: { type: String, default: 'TEST', enum: ['TEST', 'PRODUCTION'] },
    phonePeMerchantId: { type: String },
    phonePeSaltKey: { type: String },
    phonePeSaltIndex: { type: String },
    phonePeEnvironment: { type: String, default: 'TEST', enum: ['TEST', 'PRODUCTION'] },
    cashfreeAppId: { type: String },
    cashfreeSecretKey: { type: String },
    cashfreeEnvironment: { type: String, default: 'TEST', enum: ['TEST', 'PRODUCTION'] },
    
    // Shipping Settings
    isShippingEnabled: { type: Boolean, default: true },
    
    // Shop Filters
    filters: {
        isBrandFilterEnabled: { type: Boolean, default: true },
        isPriceFilterEnabled: { type: Boolean, default: true },
        isRatingFilterEnabled: { type: Boolean, default: true },
        isColorFilterEnabled: { type: Boolean, default: true },
        isSizeFilterEnabled: { type: Boolean, default: true }
    }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
module.exports = Setting;
