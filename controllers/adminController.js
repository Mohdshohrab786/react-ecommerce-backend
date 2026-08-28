const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get comprehensive dashboard stats, graphs and metrics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalUsers = await User.countDocuments();

        const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 });
        const products = await Product.find({});
        const recentUsers = await User.find({}).sort({ createdAt: -1 }).limit(5).select('name email role createdAt');

        // Total Sales Calculation
        const paidOrders = orders.filter(o => o.isPaid);
        const totalSales = Math.round(paidOrders.reduce((acc, o) => acc + (o.totalPrice || 0), 0) * 100) / 100;
        const pendingPaymentAmount = Math.round(orders.filter(o => !o.isPaid).reduce((acc, o) => acc + (o.totalPrice || 0), 0) * 100) / 100;

        // Average Order Value (AOV)
        const aov = paidOrders.length > 0 ? (totalSales / paidOrders.length).toFixed(2) : '0.00';

        // Today's Stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
        const todaySales = Math.round(todayOrders.filter(o => o.isPaid).reduce((acc, o) => acc + (o.totalPrice || 0), 0) * 100) / 100;

        // This Month's Stats
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthOrders = orders.filter(o => new Date(o.createdAt) >= firstDayOfMonth);
        const thisMonthSales = Math.round(thisMonthOrders.filter(o => o.isPaid).reduce((acc, o) => acc + (o.totalPrice || 0), 0) * 100) / 100;

        // Order Status Counts
        const statusCounts = {
            delivered: orders.filter(o => o.isDelivered).length,
            pending: orders.filter(o => !o.isDelivered && (!o.status || o.status === 'Pending')).length,
            processing: orders.filter(o => !o.isDelivered && (o.status === 'Processing' || o.status === 'Shipped')).length,
            cancelled: orders.filter(o => o.status === 'Cancelled').length,
            paid: paidOrders.length,
            unpaid: orders.length - paidOrders.length
        };

        // Payment Method Breakdown
        const paymentMethods = {};
        orders.forEach(o => {
            const method = o.paymentMethod || 'COD';
            paymentMethods[method] = (paymentMethods[method] || 0) + 1;
        });

        // Last 7 Days Daily Sales Trends
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);

            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const dayOrders = orders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= d && orderDate < nextD;
            });

            const daySales = dayOrders.reduce((acc, o) => acc + (o.isPaid ? o.totalPrice : 0), 0);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            last7Days.push({
                day: dayName,
                date: dateStr,
                sales: Math.round(daySales * 100) / 100,
                orders: dayOrders.length
            });
        }

        // Last 6 Months Sales Trends
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const year = d.getFullYear();
            const month = d.getMonth();

            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

            const monthOrders = orders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= startOfMonth && orderDate <= endOfMonth;
            });

            const monthSales = monthOrders.reduce((acc, o) => acc + (o.isPaid ? o.totalPrice : 0), 0);
            const monthName = startOfMonth.toLocaleDateString('en-US', { month: 'short' });

            last6Months.push({
                month: `${monthName} ${year !== today.getFullYear() ? `'${String(year).slice(-2)}` : ''}`,
                sales: Math.round(monthSales * 100) / 100,
                orders: monthOrders.length
            });
        }

        // Category Breakdown
        const categoryMap = {};
        products.forEach(p => {
            const cat = p.category || 'General';
            categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        });
        const categoryStats = Object.keys(categoryMap).map(cat => ({
            name: cat,
            count: categoryMap[cat],
            percentage: Math.round((categoryMap[cat] / (products.length || 1)) * 100)
        })).sort((a, b) => b.count - a.count).slice(0, 6);

        // Top Selling Products Leaderboard
        const productSalesMap = {};
        orders.forEach(order => {
            if (order.orderItems && Array.isArray(order.orderItems)) {
                order.orderItems.forEach(item => {
                    const prodId = item.product ? item.product.toString() : item.name;
                    if (!productSalesMap[prodId]) {
                        productSalesMap[prodId] = {
                            productId: item.product || '',
                            name: item.name,
                            image: item.image,
                            price: item.price,
                            totalQty: 0,
                            totalRevenue: 0
                        };
                    }
                    productSalesMap[prodId].totalQty += (item.qty || 1);
                    productSalesMap[prodId].totalRevenue += ((item.qty || 1) * (item.price || 0));
                });
            }
        });

        const topSellingProducts = Object.values(productSalesMap)
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 5);

        // Recent Orders & Low Stock
        const recentOrders = orders.slice(0, 6);
        const lowStockProducts = products.filter(p => p.countInStock < 10).slice(0, 6);

        res.json({
            totalOrders,
            totalProducts,
            totalUsers,
            totalSales,
            pendingPaymentAmount,
            aov,
            todaySales,
            todayOrders: todayOrders.length,
            thisMonthSales,
            thisMonthOrdersCount: thisMonthOrders.length,
            statusCounts,
            paymentMethods,
            last7Days,
            last6Months,
            categoryStats,
            topSellingProducts,
            recentOrders,
            lowStockProducts,
            recentUsers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDashboardStats };
