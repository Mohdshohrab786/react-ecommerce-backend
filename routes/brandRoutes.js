const express = require('express');
const router = express.Router();
const { getBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getBrands)
    .post(protect, admin, createBrand);

router.route('/:id')
    .put(protect, admin, updateBrand)
    .delete(protect, admin, deleteBrand);

module.exports = router;
