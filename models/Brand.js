const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    logo: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;
