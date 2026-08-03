const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image: { type: String, required: true },
    link: { type: String },
    type: { type: String, enum: ['Homepage', 'Offer', 'Slider', 'Popup', 'Festival', 'About', 'Contact', 'Blog', 'Shop'], required: true },
    isActive: { type: Boolean, default: true },
    scheduleDateStart: { type: Date },
    scheduleDateEnd: { type: Date },
}, { timestamps: true });

const Banner = mongoose.model('Banner', bannerSchema);
module.exports = Banner;
