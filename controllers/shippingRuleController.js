const ShippingRule = require('../models/ShippingRule');

// @desc    Get all shipping rules
// @route   GET /api/shipping-rules
// @access  Private/Admin
const getShippingRules = async (req, res) => {
    try {
        const rules = await ShippingRule.find({});
        res.json(rules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a shipping rule
// @route   POST /api/shipping-rules
// @access  Private/Admin
const createShippingRule = async (req, res) => {
    try {
        const { country, state, city, pincode, shippingCharge, deliveryDays, status } = req.body;
        
        // Ensure no duplicate exact rule exists (optional, based on requirement)
        const ruleExists = await ShippingRule.findOne({ city, pincode });
        if (ruleExists) {
            return res.status(400).json({ message: 'A rule for this City and Pincode already exists.' });
        }

        const rule = new ShippingRule({
            country, state, city, pincode, shippingCharge, deliveryDays, status
        });

        const createdRule = await rule.save();
        res.status(201).json(createdRule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a shipping rule
// @route   PUT /api/shipping-rules/:id
// @access  Private/Admin
const updateShippingRule = async (req, res) => {
    try {
        const { country, state, city, pincode, shippingCharge, deliveryDays, status } = req.body;

        const rule = await ShippingRule.findById(req.params.id);

        if (rule) {
            rule.country = country;
            rule.state = state;
            rule.city = city;
            rule.pincode = pincode;
            rule.shippingCharge = shippingCharge;
            rule.deliveryDays = deliveryDays;
            if (status !== undefined) rule.status = status;

            const updatedRule = await rule.save();
            res.json(updatedRule);
        } else {
            res.status(404).json({ message: 'Shipping Rule not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a shipping rule
// @route   DELETE /api/shipping-rules/:id
// @access  Private/Admin
const deleteShippingRule = async (req, res) => {
    try {
        const rule = await ShippingRule.findById(req.params.id);
        if (rule) {
            await rule.deleteOne();
            res.json({ message: 'Shipping Rule removed' });
        } else {
            res.status(404).json({ message: 'Shipping Rule not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Calculate shipping for checkout
// @route   POST /api/shipping-rules/calculate
// @access  Private
const calculateShipping = async (req, res) => {
    try {
        const { city, pincode } = req.body;

        if (!pincode) {
            return res.status(400).json({ message: 'Pincode is required.' });
        }

        // 1. First Priority: Exact Pincode match (ignores city spelling mistakes)
        let rule = await ShippingRule.findOne({
            pincode: pincode,
            status: true
        });

        // 2. Second Priority: City match with wildcard '*' pincode
        if (!rule) {
            rule = await ShippingRule.findOne({
                city: { $regex: new RegExp(`^${city}$`, 'i') },
                $or: [ { pincode: '*' }, { pincode: '' } ],
                status: true
            });
        }

        if (rule) {
            res.json({
                isAvailable: true,
                shippingCharge: rule.shippingCharge,
                deliveryDays: rule.deliveryDays
            });
        } else {
            res.json({
                isAvailable: false,
                message: 'Delivery not available for this location.'
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getShippingRules,
    createShippingRule,
    updateShippingRule,
    deleteShippingRule,
    calculateShipping
};
