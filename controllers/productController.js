const mongoose = require('mongoose');
const Product = require('../models/Product');
const mockProducts = require('../data/products');

// Helper to get formatted mock products with synthetic properties for UI compatibility
const getFormattedMocks = () => {
    return mockProducts.map((p, idx) => ({
        ...p,
        _id: p._id || `mock_p_${idx}`,
        isActive: true,
        isFeatured: p.rating >= 4.5,
        isTrending: p.numReviews >= 12,
        createdAt: new Date(Date.now() - idx * 86400000).toISOString()
    }));
};

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        // Removed mock fallback to let Mongoose buffer during cold starts
        const products = await Product.find({})
            .populate('category', 'name slug')
            .populate('brand', 'name')
            .sort({ updatedAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        // Removed mock fallback
        const product = await Product.findById(req.params.id)
            .populate('category', 'name')
            .populate('brand', 'name')
            .populate('relatedProducts', 'name image price slug countInStock discount');
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
    try {
        const product = new Product({
            name: 'Sample name',
            slug: `sample-name-${Date.now()}`,
            price: 0,
            user: req.user._id,
            image: '/images/sample.jpg',
            countInStock: 0,
            numReviews: 0,
            description: 'Sample description',
            isActive: false
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    const { 
        name, slug, sku, barcode, price, salePrice, discount, gstPercentage,
        description, image, gallery, brand, category, subCategories, countInStock,
        isActive, isFeatured, isTrending, seo, hasVariants, variants, sizes, relatedProducts
    } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.slug = slug || product.slug;
            product.sku = sku || product.sku;
            product.barcode = barcode || product.barcode;
            product.price = price !== undefined ? price : product.price;
            product.salePrice = salePrice !== undefined ? salePrice : product.salePrice;
            product.discount = discount !== undefined ? discount : product.discount;
            product.gstPercentage = gstPercentage !== undefined ? gstPercentage : product.gstPercentage;
            product.description = description || product.description;
            product.image = image || product.image;
            product.gallery = gallery || product.gallery;
            
            // Only update refs if provided as valid strings (avoiding empty string cast errors)
            if (brand) product.brand = brand;
            if (category) product.category = category;
            if (subCategories !== undefined) product.subCategories = subCategories;
            
            product.countInStock = countInStock !== undefined ? countInStock : product.countInStock;
            product.isActive = isActive !== undefined ? isActive : product.isActive;
            product.isFeatured = isFeatured !== undefined ? isFeatured : product.isFeatured;
            product.isTrending = isTrending !== undefined ? isTrending : product.isTrending;
            product.seo = seo || product.seo;
            product.hasVariants = hasVariants !== undefined ? hasVariants : product.hasVariants;
            product.variants = variants !== undefined ? variants : product.variants;
            product.sizes = sizes !== undefined ? sizes : product.sizes;
            product.relatedProducts = relatedProducts !== undefined ? relatedProducts : product.relatedProducts;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            await Product.deleteOne({ _id: product._id });
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = async (req, res) => {
    const { rating, comment } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            const alreadyReviewed = product.reviews.find(
                (r) => r.user.toString() === req.user._id.toString()
            );

            if (alreadyReviewed) {
                return res.status(400).json({ message: 'Product already reviewed' });
            }

            const review = {
                name: req.user.name,
                rating: Number(rating),
                comment,
                user: req.user._id
            };

            product.reviews.push(review);
            product.numReviews = product.reviews.length;
            product.rating =
                product.reviews.reduce((acc, item) => item.rating + acc, 0) /
                product.reviews.length;

            await product.save();
            res.status(201).json({ message: 'Review added' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct, createProductReview };
