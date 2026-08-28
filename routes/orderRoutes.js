const express = require('express');
const router = express.Router();
const { 
    addOrderItems, 
    getOrderById, 
    updateOrderToPaid, 
    updateOrderToDelivered, 
    updateOrderStatus,
    getMyOrders, 
    getOrders,
    deleteOrder,
    bulkDeleteOrders,
    exportOrdersCSV,
    createRazorpayOrder,
    verifyRazorpayPayment
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders);
router.route('/bulk-delete').post(protect, admin, bulkDeleteOrders);
router.route('/export/csv').get(protect, admin, exportOrdersCSV);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById).delete(protect, admin, deleteOrder);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);
router.route('/:id/status').put(protect, admin, updateOrderStatus);

// Razorpay specific routes
router.route('/:id/create-razorpay-order').post(protect, createRazorpayOrder);
router.route('/:id/verify-razorpay-payment').post(protect, verifyRazorpayPayment);

module.exports = router;
