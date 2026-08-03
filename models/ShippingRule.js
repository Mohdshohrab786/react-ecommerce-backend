const mongoose = require('mongoose');

const shippingRuleSchema = new mongoose.Schema({
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
    shippingCharge: { type: Number, required: true, default: 0 },
    deliveryDays: { type: String, required: true },
    status: { type: Boolean, default: true }
}, {
    timestamps: true
});

const ShippingRule = mongoose.model('ShippingRule', shippingRuleSchema);
module.exports = ShippingRule;
