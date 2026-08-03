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

router.route('/').post(registerUser).get(protect, admin, getUsers);
router.post('/login', authUser);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/send-register-otp', sendRegisterOtp);
router.post('/verify-register-otp', verifyRegisterOtp);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/:id').delete(protect, admin, deleteUser).get(protect, admin, getUserById).put(protect, admin, updateUser);

module.exports = router;
