const { Resend } = require('resend');
const Setting = require('../models/Setting');

const sendEmail = async (options) => {
    let setting;
    try {
        setting = await Setting.findOne({});
    } catch (error) {
        console.error('Error fetching settings from DB:', error.message);
    }

    // Initialize Resend with your API key from DB (Admin Panel SMTP Password) or Environment Variable
    const apiKey = process.env.RESEND_API_KEY || setting?.smtpPassword;
    
    if (!apiKey) {
        console.error('No Resend API Key found in env or DB setting');
        return { success: false, error: 'No API Key' };
    }

    const resend = new Resend(apiKey);
    const siteName = setting?.websiteName || 'E-Commerce';

    try {
        const { data, error } = await resend.emails.send({
            from: `"${siteName}" <onboarding@resend.dev>`,
            to: options.email,
            subject: options.subject,
            html: options.html || `<p>${options.message}</p>`,
            text: options.message,
        });

        if (error) {
            console.error('Resend API Error:', error);
            return { success: false, error };
        }

        console.log(`[EMAIL SENT] Message ID: ${data?.id}`);
        return { success: true, simulated: false };
    } catch (error) {
        console.error('Failed to send email via Resend:', error.message);
        return { success: false, error };
    }
};

module.exports = sendEmail;
