const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        // removed required for OTP registration
    },
    email: {
        type: String,
        unique: true,
        sparse: true // allows multiple users with no email
    },
    password: {
        type: String,
        // removed required for OTP registration
    },
    phone: {
        type: String,
        required: false
    },
    isAdmin: {
        type: Boolean,
        required: true,
        default: false
    },
    role: { 
        type: String, 
        enum: ['Customer', 'Admin', 'Manager', 'Support'], 
        default: 'Customer' 
    },
    permissions: [{ type: String }],
    isBlocked: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 },
    shippingAddress: {
        address: { type: String, default: '' },
        city: { type: String, default: '' },
        postalCode: { type: String, default: '' },
        country: { type: String, default: '' },
        state: { type: String, default: '' },
        phone: { type: String, default: '' }
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpire: {
        type: Date
    },
    otp: {
        type: String
    },
    otpExpire: {
        type: Date
    }
}, {
    timestamps: true
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    return resetToken;
};

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);
module.exports = User;
