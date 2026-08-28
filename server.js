require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const settingRoutes = require('./routes/settingRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const couponRoutes = require('./routes/couponRoutes');
const blogRoutes = require('./routes/blogRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const shippingRuleRoutes = require('./routes/shippingRuleRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/shipping-rules', shippingRuleRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Make uploads folder static
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Error Handling Middleware
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
});

app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// const PORT = process.env.PORT || 5000;
// if (process.env.NODE_ENV !== 'production') {
//     app.listen(PORT, () => {
//         console.log(`Server running on port ${PORT}`);
//     });
// }



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // --- KEEP-ALIVE PING FOR RENDER ---
    // Render free tier sleeps after 15 minutes. 
    // This pings the server every 14 minutes to keep it permanently awake.
    const https = require('https');
    setInterval(() => {
        https.get('https://react-ecommerce-backend-fvc6.onrender.com/', (res) => {
            console.log(`Self-ping: Render server kept awake. Status: ${res.statusCode}`);
        }).on('error', (e) => {
            console.error(`Self-ping error: ${e.message}`);
        });
    }, 14 * 60 * 1000); // 14 minutes
});

module.exports = app;