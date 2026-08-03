require('dotenv').config();
const mongoose = require('mongoose');
const Setting = require('./models/Setting');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/react-ecommerce').then(async () => {
    console.log('Connected to DB');
    const s = await Setting.findOne();
    if (s && s.smtpPassword) {
        console.log('Old Password:', s.smtpPassword);
        const fixedPass = s.smtpPassword.replace(/\s+/g, '');
        s.smtpPassword = fixedPass;
        await s.save();
        console.log('New Password (spaces removed):', s.smtpPassword);
        console.log('Database Settings Updated Successfully!');
    }
    process.exit(0);
}).catch(console.error);
