const express = require('express');
const router = express.Router();
const { 
    addOrderItems, 
    getOrderById, 
    updateOrderToPaid, 
    updateOrderToDelivered, 
    updateOrderStatus,
    cancelOrder,
    returnOrder,
    getMyOrders, 
    getOrders,
    deleteOrder,
    bulkDeleteOrders,
    exportOrdersCSV,
    createRazorpayOrder,
    verifyRazorpayPayment,
    payWithWallet,
    getCancellationEligibility,
    getReturnEligibility
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders);
router.route('/bulk-delete').post(protect, admin, bulkDeleteOrders);
router.route('/export/csv').get(protect, admin, exportOrdersCSV);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById).delete(protect, admin, deleteOrder);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/pay-with-wallet').post(protect, payWithWallet);
router.route('/:id/cancel').put(protect, cancelOrder);
router.route('/:id/cancellation-eligibility').get(protect, getCancellationEligibility);
router.route('/:id/return').put(protect, returnOrder);
router.route('/:id/return-eligibility').get(protect, getReturnEligibility);
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);
router.route('/:id/status').put(protect, admin, updateOrderStatus);

// Razorpay specific routes
router.route('/:id/create-razorpay-order').post(protect, createRazorpayOrder);
router.route('/:id/verify-razorpay-payment').post(protect, verifyRazorpayPayment);

module.exports = router;
