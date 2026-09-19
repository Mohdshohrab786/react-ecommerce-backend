require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Setting = require('../models/Setting');
const connectDB = require('../config/db');

const migrate = async () => {
    try {
        await connectDB();
        console.log('Connected to DB');

        // Migrate Settings
        let settings = await Setting.findOne();
        if (!settings) {
            settings = new Setting();
        }
        
        settings.isWalletEnabled = true;
        settings.isWalletPaymentEnabled = true;
        settings.isMixedPaymentEnabled = true;
        settings.isRefundToWalletEnabled = true;
        settings.isReturnsEnabled = true;
        settings.returnWindowDays = 7;
        settings.isCancellationEnabled = true;
        
        await settings.save();
        console.log('Settings migrated');

        // Migrate Wallets
        const users = await User.find({});
        for (const user of users) {
            let wallet = await Wallet.findOne({ user: user._id });
            if (!wallet) {
                // Read from old walletBalance if exists, else 0
                const initialBalance = user.walletBalance || 0;
                wallet = new Wallet({
                    user: user._id,
                    balance: initialBalance,
                    totalCredited: initialBalance,
                    totalDebited: 0
                });
                await wallet.save();
                console.log(`Created wallet for user ${user._id}`);
            }
        }
        console.log('Wallets migrated successfully');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

migrate();
