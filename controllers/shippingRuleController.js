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
        
        // Ensure no duplicate exact rule exists
        const ruleExists = await ShippingRule.findOne({ city, pincode });
        if (ruleExists) {
            return res.status(400).json({ message: 'A rule for this City and Pincode already exists.' });
        }

        const rule = new ShippingRule({
            country: country || 'India',
            state: state || '',
            city: city || '*',
            pincode: pincode || '*',
            shippingCharge: Number(shippingCharge) || 0,
            deliveryDays: deliveryDays || '3-5 Days',
            status: status !== undefined ? status : true
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
            if (country !== undefined) rule.country = country;
            if (state !== undefined) rule.state = state;
            if (city !== undefined) rule.city = city;
            if (pincode !== undefined) rule.pincode = pincode;
            if (shippingCharge !== undefined) rule.shippingCharge = Number(shippingCharge);
            if (deliveryDays !== undefined) rule.deliveryDays = deliveryDays;
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
        const { city, pincode, state } = req.body;

        const cleanPincode = pincode ? String(pincode).trim() : '';
        const cleanCity = city ? String(city).trim() : '';
        const cleanState = state ? String(state).trim() : '';

        // 1. First Priority: Exact Pincode match
        let rule = null;
        if (cleanPincode) {
            rule = await ShippingRule.findOne({
                pincode: cleanPincode,
                status: true
            });
        }

        // 2. Second Priority: City match with wildcard '*' pincode
        if (!rule && cleanCity) {
            rule = await ShippingRule.findOne({
                city: { $regex: new RegExp(`^${cleanCity}$`, 'i') },
                $or: [ { pincode: '*' }, { pincode: '' } ],
                status: true
            });
        }

        // 3. Third Priority: State match with wildcard '*' pincode
        if (!rule && cleanState) {
            rule = await ShippingRule.findOne({
                state: { $regex: new RegExp(`^${cleanState}$`, 'i') },
                $or: [ { pincode: '*' }, { pincode: '' } ],
                status: true
            });
        }

        // 4. Fourth Priority: Universal Global Wildcard rule (pincode: '*' or city: '*')
        if (!rule) {
            rule = await ShippingRule.findOne({
                $or: [
                    { pincode: '*' },
                    { city: '*' },
                    { city: 'All' },
                    { city: 'All Cities' }
                ],
                status: true
            });
        }

        if (rule) {
            res.json({
                isAvailable: true,
                shippingCharge: rule.shippingCharge,
                deliveryDays: rule.deliveryDays || '3-5 Days'
            });
        } else {
            // Safe fallback to Free / Standard Delivery so no customer is blocked from placing order
            res.json({
                isAvailable: true,
                shippingCharge: 0,
                deliveryDays: '4-7 Days',
                message: 'Standard Delivery'
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
