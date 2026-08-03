const express = require('express');
const router = express.Router();
const { getTransactions } = require('../controllers/transactionController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getTransactions);

module.exports = router;
