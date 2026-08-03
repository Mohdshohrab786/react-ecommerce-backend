require('dotenv').config();
const mongoose = require('mongoose');
const Setting = require('./models/Setting');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/react-ecommerce').then(async () => {
    const s = await Setting.findOne();
    console.log(s ? {
        host: s.smtpHost,
        port: s.smtpPort,
        user: s.smtpUsername,
        pass: s.smtpPassword
    } : 'No settings found');
    process.exit(0);
}).catch(console.error);
