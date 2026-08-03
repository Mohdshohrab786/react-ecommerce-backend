const mongoose = require('mongoose');
const Category = require('../models/Category');

const MOCK_CATEGORIES = [
    { _id: 'c1', name: 'Women', slug: 'women', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop', isActive: true },
    { _id: 'c2', name: 'Men', slug: 'men', image: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=1000&auto=format&fit=crop', isActive: true },
    { _id: 'c3', name: 'Accessories', slug: 'accessories', image: 'https://images.unsplash.com/photo-1509319117193-57bab727e09d?q=80&w=1000&auto=format&fit=crop', isActive: true },
    { _id: 'c4', name: 'Bags', slug: 'bags', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1000&auto=format&fit=crop', isActive: true },
    { _id: 'c5', name: 'Footwear', slug: 'footwear', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1000&auto=format&fit=crop', isActive: true },
];

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.log("Serving mock categories because database is offline");
            return res.json(MOCK_CATEGORIES);
        }
        const categories = await Category.find({});
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
    const { name, slug, image, parentCategory, isActive } = req.body;

    try {
        const categoryExists = await Category.findOne({ slug });

        if (categoryExists) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        const category = new Category({
            name,
            slug,
            image,
            parentCategory: parentCategory || null,
            isActive: isActive !== undefined ? isActive : true
        });

        const createdCategory = await category.save();
        res.status(201).json(createdCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
    const { name, slug, image, parentCategory, isActive } = req.body;

    try {
        const category = await Category.findById(req.params.id);

        if (category) {
            category.name = name || category.name;
            category.slug = slug || category.slug;
            category.image = image !== undefined ? image : category.image;
            category.parentCategory = parentCategory !== undefined ? (parentCategory || null) : category.parentCategory;
            category.isActive = isActive !== undefined ? isActive : category.isActive;

            const updatedCategory = await category.save();
            res.json(updatedCategory);
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (category) {
            await category.deleteOne();
            res.json({ message: 'Category removed' });
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
