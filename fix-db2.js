const mongoose = require('mongoose');
const Setting = require('./models/Setting');

async function fix() {
    console.log('Connecting to Atlas...');
    await mongoose.connect('mongodb+srv://ecommerc_db_user:ecommerc_db_user@cluster0.ohy9wpx.mongodb.net/?appName=Cluster0');
    console.log('Connected.');
    
    let s = await Setting.findOne({});
    if (s) {
        console.log('Found settings.');
        // Set everything exactly as the user provided
        s.smtpHost = 'smtp.gmail.com';
        s.smtpPort = '587';
        s.smtpUsername = 'learningpoint0786@gmail.com';
        // Strip spaces explicitly for DB save
        s.smtpPassword = 'fwwzjvveityxvwwl';
        s.senderEmail = 'learningpoint0786@gmail.com';
        
        await s.save();
        console.log('Saved corrected settings into Database!');
    } else {
        console.log('No settings found. Creating one...');
        s = new Setting({
            smtpHost: 'smtp.gmail.com',
            smtpPort: '587',
            smtpUsername: 'learningpoint0786@gmail.com',
            smtpPassword: 'fwwzjvveityxvwwl',
            senderEmail: 'learningpoint0786@gmail.com',
            websiteName: 'My Ecommerce'
        });
        await s.save();
        console.log('Created and saved settings!');
    }
    
    process.exit(0);
}

fix().catch(err => {
    console.error(err);
    process.exit(1);
});
