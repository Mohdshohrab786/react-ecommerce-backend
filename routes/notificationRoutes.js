const express = require('express');
const router = express.Router();
const {
    getAdminNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getAdminNotifications);

router.route('/mark-all-read')
    .put(protect, admin, markAllNotificationsAsRead);

router.route('/clear-all')
    .delete(protect, admin, clearAllNotifications);

router.route('/:id/read')
    .put(protect, admin, markNotificationAsRead);

router.route('/:id')
    .delete(protect, admin, deleteNotification);

module.exports = router;
