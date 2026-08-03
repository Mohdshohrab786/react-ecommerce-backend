require('dotenv').config();
const mongoose = require('mongoose');
const products = require('./data/products');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Category = require('./models/Category');
const Brand = require('./models/Brand');
const connectDB = require('./config/db');

const importData = async () => {
    try {
        await connectDB();
        await Order.deleteMany();
        await Product.deleteMany();
        await User.deleteMany();
        await Category.deleteMany();
        await Brand.deleteMany();

        const createdUser1 = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'password123',
            isAdmin: true
        });

        const createdUser2 = await User.create({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123'
        });

        const adminUser = createdUser1._id;

        // Seed default Categories
        const categoriesData = [
            { name: 'Electronics', slug: 'electronics', image: 'https://images.unsplash.com/photo-1509319117193-57bab727e09d?q=80&w=1000', isActive: true },
            { name: 'Women', slug: 'women', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000', isActive: true },
            { name: 'Men', slug: 'men', image: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=1000', isActive: true },
            { name: 'Accessories', slug: 'accessories', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1000', isActive: true }
        ];
        const createdCategories = await Category.insertMany(categoriesData);

        // Seed default Brands
        const brandsData = [
            { name: 'Apple', slug: 'apple', isActive: true },
            { name: 'Sony', slug: 'sony', isActive: true },
            { name: 'Logitech', slug: 'logitech', isActive: true },
            { name: 'Cannon', slug: 'cannon', isActive: true },
            { name: 'Amazon', slug: 'amazon', isActive: true }
        ];
        const createdBrands = await Brand.insertMany(brandsData);

        const sampleProducts = products.map((p) => {
            const dbCategory = createdCategories.find(c => c.name.toLowerCase() === p.category.toLowerCase()) || createdCategories[0];
            const dbBrand = createdBrands.find(b => b.name.toLowerCase() === p.brand.toLowerCase()) || createdBrands[0];

            return { 
                ...p, 
                user: adminUser,
                category: dbCategory._id,
                brand: dbBrand._id,
                slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                isActive: true
            };
        });

        await Product.insertMany(sampleProducts);

        console.log('Data Imported successfully!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

importData();
