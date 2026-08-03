const nodemailer = require('nodemailer');

async function testSMTP() {
    console.log('Sending direct email to shohrab0000@gmail.com...');
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, 
        auth: {
            user: 'learningpoint0786@gmail.com',
            pass: 'fwwzjvveityxvwwl',
        },
        connectionTimeout: 5000,
    });

    try {
        const info = await transporter.sendMail({
            from: '"Ara Web E-commerce" <learningpoint0786@gmail.com>',
            to: 'shohrab0000@gmail.com', // User's requested email
            subject: 'Test Email Delivery',
            text: 'Hello! This is a test email sent directly to shohrab0000@gmail.com to confirm that emails can reach your inbox. If you see this, your SMTP settings are working perfectly.',
        });
        console.log('Success! Message ID:', info.messageId);
    } catch (err) {
        console.log('Failed! Error:', err.message);
    }
}

testSMTP();
