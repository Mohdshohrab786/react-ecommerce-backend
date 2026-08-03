const Brand = require('../models/Brand');

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public
const getBrands = async (req, res) => {
    try {
        const brands = await Brand.find({});
        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a brand
// @route   POST /api/brands
// @access  Private/Admin
const createBrand = async (req, res) => {
    const { name, slug, logo, isActive } = req.body;

    try {
        const brandExists = await Brand.findOne({ slug });

        if (brandExists) {
            return res.status(400).json({ message: 'Brand already exists' });
        }

        const brand = new Brand({
            name,
            slug,
            logo,
            isActive: isActive !== undefined ? isActive : true
        });

        const createdBrand = await brand.save();
        res.status(201).json(createdBrand);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a brand
// @route   PUT /api/brands/:id
// @access  Private/Admin
const updateBrand = async (req, res) => {
    const { name, slug, logo, isActive } = req.body;

    try {
        const brand = await Brand.findById(req.params.id);

        if (brand) {
            brand.name = name || brand.name;
            brand.slug = slug || brand.slug;
            brand.logo = logo || brand.logo;
            brand.isActive = isActive !== undefined ? isActive : brand.isActive;

            const updatedBrand = await brand.save();
            res.json(updatedBrand);
        } else {
            res.status(404).json({ message: 'Brand not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a brand
// @route   DELETE /api/brands/:id
// @access  Private/Admin
const deleteBrand = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);

        if (brand) {
            await brand.deleteOne();
            res.json({ message: 'Brand removed' });
        } else {
            res.status(404).json({ message: 'Brand not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBrands, createBrand, updateBrand, deleteBrand };
