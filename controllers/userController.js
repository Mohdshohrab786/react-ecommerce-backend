const User = require('../models/User');
const Notification = require('../models/Notification');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const Setting = require('../models/Setting');

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                phone: user.phone || '',
                shippingAddress: user.shippingAddress,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        const setting = await Setting.findOne({});
        if (setting && setting.isOtpLoginEnabled && !phone) {
            return res.status(400).json({ message: 'Mobile number is required' });
        }
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = await User.create({ name, email, password, phone });
        if (user) {
            // Trigger admin notification for new user registration
            try {
                await Notification.create({
                    user: user._id,
                    type: 'new_user',
                    title: 'New Customer Registered',
                    message: `${user.name || 'New user'} (${user.email || user.phone || 'No email'}) just created an account.`,
                    link: '/admin/userlist',
                    meta: { userId: user._id, name: user.name, email: user.email, phone: user.phone }
                });
            } catch (notiErr) {
                console.error('Failed to create new_user notification:', notiErr.message);
            }

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                phone: user.phone,
                shippingAddress: user.shippingAddress,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                phone: user.phone || '',
                shippingAddress: user.shippingAddress,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            await User.deleteOne({ _id: user._id });
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.isAdmin = req.body.isAdmin !== undefined ? req.body.isAdmin : user.isAdmin;

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isAdmin: updatedUser.isAdmin,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone || user.phone;
            
            if (req.body.password) {
                user.password = req.body.password;
            }

            if (req.body.shippingAddress) {
                user.shippingAddress = {
                    address: req.body.shippingAddress.address !== undefined ? req.body.shippingAddress.address : user.shippingAddress.address,
                    city: req.body.shippingAddress.city !== undefined ? req.body.shippingAddress.city : user.shippingAddress.city,
                    postalCode: req.body.shippingAddress.postalCode !== undefined ? req.body.shippingAddress.postalCode : user.shippingAddress.postalCode,
                    country: req.body.shippingAddress.country !== undefined ? req.body.shippingAddress.country : user.shippingAddress.country,
                    state: req.body.shippingAddress.state !== undefined ? req.body.shippingAddress.state : user.shippingAddress.state,
                    phone: req.body.shippingAddress.phone !== undefined ? req.body.shippingAddress.phone : user.shippingAddress.phone,
                };
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isAdmin: updatedUser.isAdmin,
                phone: updatedUser.phone || '',
                shippingAddress: updatedUser.shippingAddress,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Forgot password - request reset link
// @route   POST /api/users/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found with this email address' });
        }

        // Get reset token
        const resetToken = user.getResetPasswordToken();

        await user.save({ validateBeforeSave: false });

        // Create reset url
        let frontendOrigin = 'http://localhost:3000';
        if (req.headers.origin) {
            frontendOrigin = req.headers.origin;
        } else if (req.headers.referer) {
            try {
                frontendOrigin = new URL(req.headers.referer).origin;
            } catch (e) {
                // ignore
            }
        }
        
        const resetUrl = `${frontendOrigin}/reset-password/${resetToken}`;

        const setting = await Setting.findOne({});
        const siteName = setting?.websiteName || 'Shahi Store';
        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click the link below to reset your password: \n\n ${resetUrl}`;

        try {
            const emailResult = await sendEmail({
                email: user.email,
                subject: `[${siteName}] Password Reset Request`,
                message,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 12px; background: #ffffff;">
                        <h2 style="color: #6366f1; text-align: center; margin-bottom: 5px;">${siteName}</h2>
                        <h3 style="color: #333; text-align: center; margin-top: 0;">Password Reset Request</h3>
                        <p>Hi <strong>${user.name || 'Valued Customer'}</strong>,</p>
                        <p>You requested a password reset for your account on <strong>${siteName}</strong>. Please click the button below to set a new password. This link is valid for 30 minutes.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
                        </div>
                        <p style="color: #666; font-size: 13px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #999; text-align: center;">If the button above doesn't work, copy and paste this URL into your browser:</p>
                        <p style="font-size: 12px; color: #6366f1; word-break: break-all; text-align: center;">${resetUrl}</p>
                        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">Best regards,<br/>The <strong>${siteName}</strong> Team</p>
                    </div>
                `
            });

            res.json({
                success: true,
                message: 'Password reset email sent.'
            });
        } catch (error) {
            console.error('Email sending failed:', error.message);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset password
// @route   PUT /api/users/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.json({
            success: true,
            message: 'Password reset success'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send OTP to phone
// @route   POST /api/users/send-otp
// @access  Public
const sendOtp = async (req, res) => {
    let { phone } = req.body;
    try {
        const setting = await Setting.findOne({});
        if (!setting || !setting.isOtpLoginEnabled) {
            return res.status(400).json({ message: 'OTP Login is currently disabled' });
        }

        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this mobile number' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpire = Date.now() + 5 * 60 * 1000; // 5 mins
        await user.save({ validateBeforeSave: false });

        // Ensure phone has country code for Twilio
        let twilioPhone = phone;
        if (twilioPhone.length === 10 && !twilioPhone.startsWith('+')) {
            twilioPhone = '+91' + twilioPhone;
        } else if (!twilioPhone.startsWith('+')) {
            twilioPhone = '+' + twilioPhone;
        }

        const message = `Your login OTP is: ${otp}. Valid for 5 minutes.`;
        const smsResult = await sendSMS({ phone: twilioPhone, message });

        if (!smsResult.success) {
             let errorMsg = 'Failed to send SMS OTP';
             if (smsResult.error) {
                 try {
                     const parsed = JSON.parse(smsResult.error);
                     if (parsed.message) errorMsg += `: ${parsed.message}`;
                 } catch (e) {
                     errorMsg += `: ${smsResult.error}`;
                 }
             }
             return res.status(500).json({ message: errorMsg });
        }

        // During dev/simulation, we can optionally log the OTP or return it if it's simulated.
        // For production, never return the OTP in the API response!
        res.json({ 
            success: true, 
            message: 'OTP sent successfully', 
            simulated: smsResult.simulated,
            // For testing convenience when simulated, we return the OTP to the UI so we can log in without checking backend terminal
            ...(smsResult.simulated && { mockOtp: otp })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP and login
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
    const { phone, otp } = req.body;
    try {
        const user = await User.findOne({ phone, otp, otpExpire: { $gt: Date.now() } });
        if (user) {
            user.otp = undefined;
            user.otpExpire = undefined;
            await user.save({ validateBeforeSave: false });

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                phone: user.phone || '',
                shippingAddress: user.shippingAddress,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid or expired OTP' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send OTP to phone for Registration
// @route   POST /api/users/send-register-otp
// @access  Public
const sendRegisterOtp = async (req, res) => {
    let { phone } = req.body;
    try {
        const setting = await Setting.findOne({});
        if (!setting || !setting.isOtpLoginEnabled) {
            return res.status(400).json({ message: 'OTP Login/Registration is currently disabled' });
        }

        // Check if user exists and is actually fully registered (has password or name) or just a phone
        // Actually, if they exist and have no OTP, they are registered.
        const userExists = await User.findOne({ phone, otp: { $exists: false } }); 
        if (userExists) {
            return res.status(400).json({ message: 'Mobile number already registered. Please login.' });
        }

        let user = await User.findOne({ phone });
        if (!user) {
            user = new User({ phone });
        }
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpire = Date.now() + 5 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        // Ensure phone has country code for Twilio
        let twilioPhone = phone;
        if (twilioPhone.length === 10 && !twilioPhone.startsWith('+')) {
            twilioPhone = '+91' + twilioPhone;
        } else if (!twilioPhone.startsWith('+')) {
            twilioPhone = '+' + twilioPhone;
        }

        const message = `Your registration OTP is: ${otp}. Valid for 5 minutes.`;
        const smsResult = await sendSMS({ phone: twilioPhone, message });

        if (!smsResult.success) {
             let errorMsg = 'Failed to send SMS OTP';
             if (smsResult.error) {
                 try {
                     const parsed = JSON.parse(smsResult.error);
                     if (parsed.message) errorMsg += `: ${parsed.message}`;
                 } catch (e) {
                     errorMsg += `: ${smsResult.error}`;
                 }
             }
             return res.status(500).json({ message: errorMsg });
        }

        res.json({ 
            success: true, 
            message: 'OTP sent successfully', 
            simulated: smsResult.simulated,
            ...(smsResult.simulated && { mockOtp: otp })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Registration OTP
// @route   POST /api/users/verify-register-otp
// @access  Public
const verifyRegisterOtp = async (req, res) => {
    const { phone, otp } = req.body;
    try {
        const user = await User.findOne({ phone, otp, otpExpire: { $gt: Date.now() } });
        if (user) {
            user.otp = undefined;
            user.otpExpire = undefined;
            await user.save({ validateBeforeSave: false });

            // Trigger admin notification for new user OTP registration
            try {
                await Notification.create({
                    user: user._id,
                    type: 'new_user',
                    title: 'New Customer Registered',
                    message: `${user.name || 'New user'} (${user.phone || user.email || 'Phone user'}) registered via OTP.`,
                    link: '/admin/userlist',
                    meta: { userId: user._id, name: user.name, phone: user.phone, email: user.email }
                });
            } catch (notiErr) {
                console.error('Failed to create new_user OTP notification:', notiErr.message);
            }

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                phone: user.phone || '',
                shippingAddress: user.shippingAddress,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid or expired OTP' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
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
};
