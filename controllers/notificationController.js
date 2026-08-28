const Notification = require('../models/Notification');

// @desc    Get all notifications for admin
// @route   GET /api/admin/notifications
// @access  Private/Admin
const getAdminNotifications = async (req, res) => {
    try {
        const { type, unreadOnly, limit = 100, page = 1 } = req.query;
        const query = {};

        if (type && type !== 'all') {
            query.type = type;
        }

        if (unreadOnly === 'true' || unreadOnly === true) {
            query.isRead = false;
        }

        const pageSize = Number(limit);
        const currentPage = Math.max(1, Number(page));
        const skip = (currentPage - 1) * pageSize;

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .populate('user', 'name email phone');

        const unreadCount = await Notification.countDocuments({ isRead: false });
        const totalCount = await Notification.countDocuments();
        const filteredCount = await Notification.countDocuments(query);

        res.json({
            success: true,
            notifications,
            unreadCount,
            totalCount,
            filteredCount,
            page: currentPage,
            pages: Math.ceil(filteredCount / pageSize) || 1
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark a notification as read
// @route   PUT /api/admin/notifications/:id/read
// @access  Private/Admin
const markNotificationAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        notification.isRead = true;
        const updated = await notification.save();
        const unreadCount = await Notification.countDocuments({ isRead: false });

        res.json({
            success: true,
            notification: updated,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/admin/notifications/mark-all-read
// @access  Private/Admin
const markAllNotificationsAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ isRead: false }, { isRead: true });
        const unreadCount = await Notification.countDocuments({ isRead: false });

        res.json({
            success: true,
            message: 'All notifications marked as read',
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a notification
// @route   DELETE /api/admin/notifications/:id
// @access  Private/Admin
const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await Notification.deleteOne({ _id: req.params.id });
        const unreadCount = await Notification.countDocuments({ isRead: false });

        res.json({
            success: true,
            message: 'Notification removed',
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Clear all notifications
// @route   DELETE /api/admin/notifications/clear-all
// @access  Private/Admin
const clearAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({});
        res.json({
            success: true,
            message: 'All notifications cleared',
            unreadCount: 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAdminNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications
};
