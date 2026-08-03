const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, { timestamps: true });

const variantSchema = new mongoose.Schema({
    colorName: { type: String, required: true },
    colorCode: { type: String },
    price: { type: Number, required: true, default: 0 },
    image: { type: String, required: true },
    countInStock: { type: Number, required: true, default: 0 }
});

const productSchema = new mongoose.Schema({
    hasVariants: { type: Boolean, default: false },
    variants: [variantSchema],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String },
    barcode: { type: String },
    image: { type: String, required: true },
    gallery: [{ type: String }], // Array of additional images
    sizes: [{ type: String }],
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    subCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    seo: {
        title: { type: String },
        description: { type: String },
        keywords: { type: String }
    },
    reviews: [reviewSchema],
    rating: { type: Number, required: true, default: 0 },
    numReviews: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true, default: 0 },
    salePrice: { type: Number },
    discount: { type: Number, default: 0 },
    gstPercentage: { type: Number, default: 0 },
    countInStock: { type: Number, required: true, default: 0 }
}, {
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
