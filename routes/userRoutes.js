const express = require('express');
const router = express.Router();
const { 
    authUser, 
    registerUser, 
    getUserProfile, 
    getUsers, 
    deleteUser, 
    getUserById, 
    updateUser, 
    updateUserProfile,
    forgotPassword,
    resetPassword,
    sendOtp,
    verifyOtp,
    sendRegisterOtp,
    verifyRegisterOtp
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Limit each IP to 10 requests per `window` (here, per 5 minutes)
    message: { message: 'Too many login attempts from this IP, please try again after 5 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 OTP requests per 15 mins
    message: { message: 'Too many OTP requests from this IP, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.route('/').post(registerUser).get(protect, admin, getUsers);
router.post('/login', authLimiter, authUser);
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/send-register-otp', otpLimiter, sendRegisterOtp);
router.post('/verify-register-otp', authLimiter, verifyRegisterOtp);
router.post('/forgotpassword', otpLimiter, forgotPassword);
router.put('/resetpassword/:resettoken', authLimiter, resetPassword);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/:id').delete(protect, admin, deleteUser).get(protect, admin, getUserById).put(protect, admin, updateUser);

module.exports = router;
