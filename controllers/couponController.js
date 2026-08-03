const Coupon = require('../models/Coupon');

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
const getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find({}).sort({ createdAt: -1 });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a coupon
// @route   POST /api/coupons
// @access  Private/Admin
const createCoupon = async (req, res) => {
    const { code, type, value, startDate, endDate, usageLimit, minimumOrder, appliesTo, productIds } = req.body;

    try {
        const couponExists = await Coupon.findOne({ code: code.toUpperCase() });

        if (couponExists) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        const coupon = new Coupon({
            code: code.toUpperCase(),
            type,
            value,
            startDate: startDate || new Date(),
            endDate,
            usageLimit: usageLimit || 100,
            minimumOrder: minimumOrder || 0,
            isActive: true,
            appliesTo: appliesTo || 'All',
            productIds: productIds || []
        });

        const createdCoupon = await coupon.save();
        res.status(201).json(createdCoupon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
const updateCoupon = async (req, res) => {
    const { code, type, value, endDate, usageLimit, minimumOrder, appliesTo, productIds, isActive } = req.body;

    try {
        const coupon = await Coupon.findById(req.params.id);

        if (coupon) {
            coupon.code = code ? code.trim().toUpperCase() : coupon.code;
            coupon.type = type || coupon.type;
            coupon.value = value !== undefined ? Number(value) : coupon.value;
            coupon.endDate = endDate || coupon.endDate;
            coupon.usageLimit = usageLimit !== undefined ? Number(usageLimit) : coupon.usageLimit;
            coupon.minimumOrder = minimumOrder !== undefined ? Number(minimumOrder) : coupon.minimumOrder;
            coupon.appliesTo = appliesTo || coupon.appliesTo;
            coupon.productIds = productIds || coupon.productIds;
            coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;

            const updatedCoupon = await coupon.save();
            res.json(updatedCoupon);
        } else {
            res.status(404).json({ message: 'Coupon not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
const deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (coupon) {
            await Coupon.deleteOne({ _id: req.params.id });
            res.json({ message: 'Coupon removed successfully' });
        } else {
            res.status(404).json({ message: 'Coupon not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Validate a coupon code
// @route   POST /api/coupons/validate
// @access  Private
const validateCoupon = async (req, res) => {
    const { code, cartTotal, cartItems } = req.body;

    try {
        if (!code) {
            return res.status(400).json({ message: 'Please enter a coupon code' });
        }

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid coupon code' });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ message: 'Coupon is inactive' });
        }

        const now = new Date();
        if (now > new Date(coupon.endDate)) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        if (coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Coupon usage limit has been reached' });
        }

        if (coupon.appliesTo === 'Specific') {
            if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
                return res.status(400).json({ message: 'Cart items are required to validate this coupon' });
            }

            // Filter cart items that match the coupon's eligible products
            const couponProductIdsStr = coupon.productIds.map(id => id.toString());
            const eligibleItems = cartItems.filter(item => couponProductIdsStr.includes(item.product.toString()));

            if (eligibleItems.length === 0) {
                return res.status(400).json({ message: 'This coupon is not applicable to any items in your cart' });
            }

            // Calculate eligible cart total
            const eligibleTotal = eligibleItems.reduce((acc, item) => acc + item.price * item.qty, 0);

            if (eligibleTotal < coupon.minimumOrder) {
                return res.status(400).json({ message: `Minimum order amount of eligible products to use this coupon is $${coupon.minimumOrder}` });
            }

            // Calculate discount amount based only on eligible items total
            let discount = 0;
            if (coupon.type === 'Percentage') {
                discount = (coupon.value / 100) * eligibleTotal;
            } else if (coupon.type === 'Flat') {
                discount = coupon.value;
            }

            // Ensure discount is not greater than eligible items total
            discount = Math.min(discount, eligibleTotal);

            return res.json({
                _id: coupon._id,
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                discountAmount: Number(discount.toFixed(2))
            });
        }

        // Default logic for coupons applying to all products
        if (cartTotal < coupon.minimumOrder) {
            return res.status(400).json({ message: `Minimum order amount to use this coupon is $${coupon.minimumOrder}` });
        }

        // Calculate discount amount
        let discount = 0;
        if (coupon.type === 'Percentage') {
            discount = (coupon.value / 100) * cartTotal;
        } else if (coupon.type === 'Flat') {
            discount = coupon.value;
        }

        // Ensure discount is not greater than cartTotal
        discount = Math.min(discount, cartTotal);

        res.json({
            _id: coupon._id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            discountAmount: Number(discount.toFixed(2))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get active coupons for a specific product
// @route   GET /api/coupons/active/:productId
// @access  Public
const getActiveCouponsForProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const now = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            endDate: { $gte: now }
        });

        // Filter coupons that apply to this product
        const applicableCoupons = coupons.filter(coupon => {
            if (coupon.appliesTo === 'All') {
                return true;
            }
            if (coupon.appliesTo === 'Specific') {
                return coupon.productIds.map(id => id.toString()).includes(productId);
            }
            return false;
        });

        res.json(applicableCoupons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    getActiveCouponsForProduct
};
