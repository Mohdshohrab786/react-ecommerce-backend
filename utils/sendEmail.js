const nodemailer = require('nodemailer');
const Setting = require('../models/Setting');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const sendEmail = async (options) => {
    let setting;
    try {
        setting = await Setting.findOne({});
    } catch (error) {
        console.error('Error fetching SMTP settings from DB:', error.message);
    }

    let host = setting?.smtpHost;
    const port = setting?.smtpPort;
    const user = setting?.smtpUsername;
    const pass = setting?.smtpPassword;
    const sender = setting?.senderEmail || user;
    const siteName = setting?.websiteName || 'E-Commerce';

    if (host && port && user && pass) {
        // Manually resolve host to IPv4 to completely prevent ENETUNREACH IPv6 errors
        if (!host.match(/^[0-9.]+$/)) {
            try {
                const { address } = await require('util').promisify(dns.lookup)(host, { family: 4 });
                console.log(`Resolved SMTP host ${host} to IPv4: ${address}`);
                host = address;
            } catch (err) {
                console.error(`DNS IPv4 resolution failed for ${host}:`, err.message);
            }
        }

        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port) || 587,
            secure: parseInt(port) === 465,
            auth: {
                user,
                pass: pass.replace(/\s+/g, ''),
            },
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000,
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: `"${siteName}" <${sender}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html || `<p>${options.message}</p>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SENT] Message ID: ${info.messageId}`);
        return { success: true, simulated: false };
    } else {
        console.log(`[EMAIL SIMULATION]`);
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Message: ${options.message}`);
        return { success: true, simulated: true };
    }
};

module.exports = sendEmail;
