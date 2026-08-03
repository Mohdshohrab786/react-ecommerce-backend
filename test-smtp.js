const nodemailer = require('nodemailer');

async function testSMTP() {
    console.log('Testing SMTP connection...');
    const user = 'learningpoint0786@gmail.com';
    const pass = 'fwwz jvve ityx vwwl'.replace(/\s+/g, '');
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user,
            pass,
        },
        connectionTimeout: 5000,
    });

    try {
        const info = await transporter.sendMail({
            from: `"Test" <${user}>`,
            to: user, // send to self
            subject: 'Test Email',
            text: 'This is a test email to verify SMTP settings.',
        });
        console.log('Success! Message ID:', info.messageId);
    } catch (err) {
        console.log('Failed! Error:', err.message);
    }
}

testSMTP();
