const express = require('express');
const router = express.Router();
const {
    getShippingRules,
    createShippingRule,
    updateShippingRule,
    deleteShippingRule,
    calculateShipping
} = require('../controllers/shippingRuleController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getShippingRules)
    .post(protect, admin, createShippingRule);

router.route('/calculate')
    .post(calculateShipping);

router.route('/:id')
    .put(protect, admin, updateShippingRule)
    .delete(protect, admin, deleteShippingRule);

module.exports = router;
