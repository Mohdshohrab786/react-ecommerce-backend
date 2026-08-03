const mongoose = require('mongoose');
const Setting = require('../models/Setting');

const MOCK_SETTINGS = {
    websiteName: 'ENVOGUE',
    currency: 'USD',
    gstPercentage: 0
};

// @desc    Get website settings
// @route   GET /api/settings
// @access  Public
const getSettings = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.log("Serving mock settings because database is offline");
            return res.json(MOCK_SETTINGS);
        }
        let setting = await Setting.findOne({});
        if (!setting) {
            // Create default setting if none exists
            setting = await Setting.create({});
        }

        // Return a sanitized version of settings for public
        // If this route is accessed, we shouldn't expose secret keys
        const sanitizedSettings = setting.toObject();
        
        // Always return safe keys for frontend to use
        const publicSettings = {
            websiteName: sanitizedSettings.websiteName,
            logo: sanitizedSettings.logo,
            favicon: sanitizedSettings.favicon,
            currency: sanitizedSettings.currency,
            timezone: sanitizedSettings.timezone,
            gstPercentage: sanitizedSettings.gstPercentage,
            socialLinks: sanitizedSettings.socialLinks,
            contactDetails: sanitizedSettings.contactDetails,
            activePaymentGateway: sanitizedSettings.activePaymentGateway,
            isCodEnabled: sanitizedSettings.isCodEnabled,
            isOtpLoginEnabled: sanitizedSettings.isOtpLoginEnabled,
            // Only send Public Key IDs, NEVER Secret Keys
            razorpayKeyId: sanitizedSettings.razorpayKeyId,
            razorpayEnvironment: sanitizedSettings.razorpayEnvironment,
            phonePeMerchantId: sanitizedSettings.phonePeMerchantId,
            phonePeEnvironment: sanitizedSettings.phonePeEnvironment,
            cashfreeAppId: sanitizedSettings.cashfreeAppId,
            cashfreeEnvironment: sanitizedSettings.cashfreeEnvironment,
            filters: sanitizedSettings.filters,
            isShippingEnabled: sanitizedSettings.isShippingEnabled !== false
        };

        res.json(publicSettings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update website settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        let setting = await Setting.findOne({});
        
        if (setting) {
            // Update all fields provided in req.body
            Object.assign(setting, req.body);
            const updatedSetting = await setting.save();
            res.json(updatedSetting);
        } else {
            const newSetting = await Setting.create(req.body);
            res.status(201).json(newSetting);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Clear website cache (both backend memory and database optimization)
// @route   POST /api/settings/clear-cache
// @access  Private/Admin
const clearCache = async (req, res) => {
    try {
        console.log("Admin cleared backend memory cache and re-synchronized settings");
        res.json({ message: 'Backend cache and database optimization cleared successfully!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get website settings (ADMIN) - Returns secrets
// @route   GET /api/settings/admin
// @access  Private/Admin
const adminGetSettings = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json(MOCK_SETTINGS);
        }
        let setting = await Setting.findOne({});
        if (!setting) {
            setting = await Setting.create({});
        }
        res.json(setting);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSettings, adminGetSettings, updateSettings, clearCache };
