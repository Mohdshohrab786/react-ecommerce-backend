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

// @desc    Bulk Import Products from CSV / JSON
// @route   POST /api/products/bulk-import
// @access  Private/Admin
const bulkImportProducts = async (req, res) => {
    try {
        const { products } = req.body;
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'No product data provided for import.' });
        }

        const Category = require('../models/Category');
        const Brand = require('../models/Brand');

        // Fetch existing categories & brands for fast lookup
        const existingCategories = await Category.find({});
        const categoryMap = new Map();
        existingCategories.forEach(c => categoryMap.set(c.name.toLowerCase().trim(), c._id));

        const existingBrands = await Brand.find({});
        const brandMap = new Map();
        existingBrands.forEach(b => brandMap.set(b.name.toLowerCase().trim(), b._id));

        let createdCount = 0;
        let updatedCount = 0;
        const errors = [];

        for (let i = 0; i < products.length; i++) {
            const row = products[i];
            const name = (row.name || row.Name || row['Product Name'] || '').trim();
            if (!name) {
                errors.push(`Row ${i + 1}: Product name is missing.`);
                continue;
            }

            const price = Number(row.price || row.Price || 0);
            const countInStock = Number(row.countInStock || row.Stock || row.stock || row['Count In Stock'] || 0);
            const description = (row.description || row.Description || row.desc || `${name} premium product`).trim();
            const image = (row.image || row.Image || row['Image URL'] || '/images/sample.jpg').trim();
            const sku = (row.sku || row.SKU || '').trim();
            const discount = Number(row.discount || row.Discount || 0);
            const salePrice = Number(row.salePrice || row['Sale Price'] || 0) || (discount > 0 ? price - (price * discount / 100) : price);
            const gstPercentage = Number(row.gstPercentage || row.GST || 0);
            const categoryName = (row.category || row.Category || '').trim();
            const brandName = (row.brand || row.Brand || '').trim();

            // Resolve or create category
            let categoryId = null;
            if (categoryName) {
                const catKey = categoryName.toLowerCase();
                if (categoryMap.has(catKey)) {
                    categoryId = categoryMap.get(catKey);
                } else {
                    const catSlug = catKey.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
                    const newCat = await Category.create({
                        name: categoryName,
                        slug: catSlug,
                        isActive: true
                    });
                    categoryId = newCat._id;
                    categoryMap.set(catKey, newCat._id);
                }
            }

            // Resolve or create brand
            let brandId = null;
            if (brandName) {
                const brandKey = brandName.toLowerCase();
                if (brandMap.has(brandKey)) {
                    brandId = brandMap.get(brandKey);
                } else {
                    const brandSlug = brandKey.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
                    const newBrand = await Brand.create({
                        name: brandName,
                        slug: brandSlug,
                        isActive: true
                    });
                    brandId = newBrand._id;
                    brandMap.set(brandKey, newBrand._id);
                }
            }

            const slug = (row.slug || row.Slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4) + Math.floor(Math.random() * 1000);

            // Check if product exists by SKU or Exact Name
            let existingProduct = null;
            if (sku) {
                existingProduct = await Product.findOne({ sku });
            }
            if (!existingProduct) {
                existingProduct = await Product.findOne({ name });
            }

            if (existingProduct) {
                existingProduct.price = price;
                existingProduct.salePrice = salePrice;
                existingProduct.discount = discount;
                existingProduct.countInStock = countInStock;
                existingProduct.description = description;
                if (image && image !== '/images/sample.jpg') existingProduct.image = image;
                if (categoryId) existingProduct.category = categoryId;
                if (brandId) existingProduct.brand = brandId;
                if (sku) existingProduct.sku = sku;
                existingProduct.gstPercentage = gstPercentage;
                existingProduct.isActive = true;
                await existingProduct.save();
                updatedCount++;
            } else {
                await Product.create({
                    user: req.user._id,
                    name,
                    slug,
                    sku: sku || `SKU-${Date.now().toString().slice(-6)}-${i+1}`,
                    price,
                    salePrice,
                    discount,
                    gstPercentage,
                    countInStock,
                    description,
                    image,
                    category: categoryId,
                    brand: brandId,
                    isActive: true,
                    isFeatured: false,
                    isTrending: false,
                    rating: 0,
                    numReviews: 0
                });
                createdCount++;
            }
        }

        res.json({
            message: `Bulk import completed! ${createdCount} new product(s) added, ${updatedCount} updated.`,
            createdCount,
            updatedCount,
            totalProcessed: products.length,
            errors
        });
    } catch (error) {
        console.error('Bulk Import Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export all products as CSV
// @route   GET /api/products/export/csv
// @access  Private/Admin
const exportProductsCSV = async (req, res) => {
    try {
        const products = await Product.find({})
            .populate('category', 'name')
            .populate('brand', 'name')
            .sort({ createdAt: -1 });

        const headers = [
            'Product Name',
            'SKU',
            'Category',
            'Brand',
            'Price (INR)',
            'Sale Price (INR)',
            'Discount (%)',
            'Stock Qty',
            'GST (%)',
            'Image URL',
            'Description',
            'Is Active',
            'Is Featured'
        ];

        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = products.map(p => [
            escapeCSV(p.name),
            escapeCSV(p.sku || ''),
            escapeCSV(p.category?.name || ''),
            escapeCSV(p.brand?.name || ''),
            p.price || 0,
            p.salePrice || p.price || 0,
            p.discount || 0,
            p.countInStock || 0,
            p.gstPercentage || 0,
            escapeCSV(p.image || '/images/sample.jpg'),
            escapeCSV(p.description || ''),
            p.isActive ? 'YES' : 'NO',
            p.isFeatured ? 'YES' : 'NO'
        ].join(','));

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `shahi_store_products_${timestamp}.csv`;
        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csvContent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    getProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct, 
    createProductReview,
    bulkImportProducts,
    exportProductsCSV
};
