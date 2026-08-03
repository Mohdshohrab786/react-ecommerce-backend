const mongoose = require('mongoose');
const Setting = require('./models/Setting');
const nodemailer = require('nodemailer');

async function testAtoZ() {
    console.log('Connecting to DB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/react-ecommerce');
    
    console.log('Fetching settings...');
    const setting = await Setting.findOne({});
    if (!setting) {
        console.log('No settings found in DB!');
        process.exit(1);
    }
    
    const host = setting?.smtpHost;
    const port = setting?.smtpPort;
    const user = setting?.smtpUsername;
    const pass = setting?.smtpPassword;
    const sender = setting?.senderEmail || user;
    const siteName = setting?.websiteName || 'Test Site';
    
    console.log(`Settings loaded: Host=${host}, Port=${port}, User=${user}`);
    
    const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port) || 587,
        secure: parseInt(port) === 465,
        auth: {
            user,
            pass: pass ? pass.replace(/\s+/g, '') : pass,
        },
        connectionTimeout: 10000,
    });
    
    console.log('Attempting to send email to shohrab0000@gmail.com...');
    try {
        const info = await transporter.sendMail({
            from: `${siteName} <${sender}>`,
            to: 'shohrab0000@gmail.com', // Sending to the user's email
            subject: 'Test Password Reset',
            text: 'This is an automated test from A to Z.',
        });
        console.log('SUCCESS! Email sent. Message ID:', info.messageId);
    } catch (err) {
        console.log('FAILED! Error details:', err);
    }
    
    process.exit(0);
}

testAtoZ();
