const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalUsers = await User.countDocuments();

        const orders = await Order.find({});
        const totalSales = orders.reduce((acc, item) => acc + (item.isPaid ? item.totalPrice : 0), 0);

        const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5).populate('user', 'name');
        const lowStockProducts = await Product.find({ countInStock: { $lt: 10 } }).limit(5);

        res.json({
            totalOrders,
            totalProducts,
            totalUsers,
            totalSales,
            recentOrders,
            lowStockProducts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDashboardStats };
