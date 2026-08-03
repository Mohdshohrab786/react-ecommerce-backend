const mongoose = require('mongoose');
const Banner = require('../models/Banner');

const MOCK_BANNERS = [
    { _id: 'b1', title: 'New Autumn Collection', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop', link: '/shop', type: 'Homepage', isActive: true },
    { _id: 'b2', title: 'Minimalist Essentials', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2071&auto=format&fit=crop', link: '/shop', type: 'Homepage', isActive: true },
    { _id: 'b3', title: 'Exclusive Accessories', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop', link: '/shop', type: 'Homepage', isActive: true }
];

// @desc    Get all banners
// @route   GET /api/banners
// @access  Public
const getBanners = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.log("Serving mock banners because database is offline");
            return res.json(MOCK_BANNERS);
        }
        const banners = await Banner.find({});
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a banner
// @route   POST /api/banners
// @access  Private/Admin
const createBanner = async (req, res) => {
    const { title, image, link, type, isActive, scheduleDateStart, scheduleDateEnd } = req.body;

    try {
        const banner = new Banner({
            title,
            image,
            link,
            type: type || 'Homepage',
            isActive: isActive !== undefined ? isActive : true,
            scheduleDateStart,
            scheduleDateEnd
        });

        const createdBanner = await banner.save();
        res.status(201).json(createdBanner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a banner
// @route   PUT /api/banners/:id
// @access  Private/Admin
const updateBanner = async (req, res) => {
    const { title, image, link, type, isActive, scheduleDateStart, scheduleDateEnd } = req.body;

    try {
        const banner = await Banner.findById(req.params.id);

        if (banner) {
            banner.title = title || banner.title;
            banner.image = image || banner.image;
            banner.link = link !== undefined ? link : banner.link;
            banner.type = type || banner.type;
            banner.isActive = isActive !== undefined ? isActive : banner.isActive;
            banner.scheduleDateStart = scheduleDateStart || banner.scheduleDateStart;
            banner.scheduleDateEnd = scheduleDateEnd || banner.scheduleDateEnd;

            const updatedBanner = await banner.save();
            res.json(updatedBanner);
        } else {
            res.status(404).json({ message: 'Banner not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a banner
// @route   DELETE /api/banners/:id
// @access  Private/Admin
const deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (banner) {
            await banner.deleteOne();
            res.json({ message: 'Banner removed' });
        } else {
            res.status(404).json({ message: 'Banner not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBanners, createBanner, updateBanner, deleteBanner };
