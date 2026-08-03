const https = require('https');
const querystring = require('querystring');
const Setting = require('../models/Setting');

const sendSMS = async (options) => {
    let setting;
    try {
        setting = await Setting.findOne({});
    } catch (error) {
        console.error('Error fetching Twilio settings from DB:', error.message);
    }

    const sid = setting?.twilioAccountSid;
    const token = setting?.twilioAuthToken;
    const fromPhone = setting?.twilioNumber;

    if (sid && token && fromPhone) {
        return new Promise((resolve) => {
            const postData = querystring.stringify({
                To: options.phone,
                From: fromPhone,
                Body: options.message
            });

            const auth = Buffer.from(`${sid}:${token}`).toString('base64');

            const reqOptions = {
                hostname: 'api.twilio.com',
                port: 443,
                path: `/2010-04-01/Accounts/${sid}/Messages.json`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postData.length,
                    'Authorization': `Basic ${auth}`
                }
            };

            const req = https.request(reqOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const response = JSON.parse(data);
                            console.log(`[SMS SENT] Twilio Message SID: ${response.sid}`);
                            resolve({ success: true, simulated: false });
                        } catch (e) {
                            resolve({ success: true, simulated: false });
                        }
                    } else {
                        console.error('Twilio SMS error code:', res.statusCode, data);
                        resolve({ success: false, error: data });
                    }
                });
            });

            req.on('error', (e) => {
                console.error('Twilio request error:', e.message);
                resolve({ success: false, error: e.message });
            });

            req.write(postData);
            req.end();
        });
    } else {
        console.log(`[SMS SIMULATION]`);
        console.log(`To: ${options.phone}`);
        console.log(`Message: ${options.message}`);
        return { success: true, simulated: true };
    }
};

module.exports = sendSMS;
