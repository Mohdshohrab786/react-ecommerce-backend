const Wishlist = require('../models/Wishlist');

// @desc    Get logged in user's wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
            path: 'products',
            select: 'name price image image2 rating numReviews countInStock isActive category brand'
        });

        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user._id, products: [] });
        }

        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add product to wishlist
// @route   POST /api/wishlist/add
// @access  Private
const addToWishlist = async (req, res) => {
    const { productId } = req.body;
    try {
        let wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user._id, products: [] });
        }

        if (wishlist.products.includes(productId)) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }

        wishlist.products.push(productId);
        await wishlist.save();

        const updatedWishlist = await Wishlist.findOne({ user: req.user._id }).populate({
            path: 'products',
            select: 'name price image image2 rating numReviews countInStock isActive category brand'
        });

        res.json(updatedWishlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/remove/:productId
// @access  Private
const removeFromWishlist = async (req, res) => {
    const { productId } = req.params;
    try {
        let wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        wishlist.products.pull(productId);
        await wishlist.save();

        const updatedWishlist = await Wishlist.findOne({ user: req.user._id }).populate({
            path: 'products',
            select: 'name price image image2 rating numReviews countInStock isActive category brand'
        });

        res.json(updatedWishlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
