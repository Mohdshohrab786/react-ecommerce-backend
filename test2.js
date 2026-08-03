const mongoose = require('mongoose');
const User = require('./models/User');
const crypto = require('crypto');
const axios = require('axios');

async function testReset() {
    await mongoose.connect('mongodb://127.0.0.1:27017/react-ecommerce'); // Adjust connection string if needed
    
    let user = await User.findOne({ email: 'shohrab0000@gmail.com' });
    if (!user) {
        console.log('User not found in DB!');
        process.exit(1);
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    
    console.log('Generated token:', resetToken);
    console.log('Hitting API...');

    try {
        const res = await axios.put(`http://localhost:5000/api/users/resetpassword/${resetToken}`, {
            password: 'newpassword123'
        });
        console.log('Success:', res.data);
    } catch (err) {
        console.log('Error:', err.response ? err.response.data : err.message);
    }
    
    process.exit(0);
}

testReset();
