const express = require('express');
const router = express.Router();
const {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    getActiveCouponsForProduct
} = require('../controllers/couponController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getCoupons)
    .post(protect, admin, createCoupon);

router.post('/validate', protect, validateCoupon);
router.get('/active/:productId', getActiveCouponsForProduct);

router.route('/:id')
    .put(protect, admin, updateCoupon)
    .delete(protect, admin, deleteCoupon);

module.exports = router;
