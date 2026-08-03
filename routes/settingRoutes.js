const express = require('express');
const router = express.Router();
const { getSettings, adminGetSettings, updateSettings, clearCache } = require('../controllers/settingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getSettings)
    .put(protect, admin, updateSettings);

router.route('/admin')
    .get(protect, admin, adminGetSettings);

router.route('/clear-cache')
    .post(protect, admin, clearCache);

module.exports = router;
