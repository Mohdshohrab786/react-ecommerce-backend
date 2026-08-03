const mongoose = require('mongoose');
require('dotenv').config();
const Blog = require('./models/Blog');

const MOCK_POSTS = [
    {
        title: 'The Art of Minimalism: building a capsule wardrobe',
        slug: 'the-art-of-minimalism-building-a-capsule-wardrobe',
        category: 'Style Guide',
        createdAt: '2026-07-10T00:00:00Z',
        excerpt: 'Discover how to declutter your closet and curate a collection of high-quality, versatile essentials that never go out of style.',
        image: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=800&auto=format&fit=crop',
        readTime: '5 min read',
        author: 'Admin',
        isActive: true,
        content: `
            <p>Building a capsule wardrobe is not just about saving space; it is a philosophy of mindful living. In a world saturated with fleeting trends and cheap quality, choosing to define your style by less is a powerful statement of elegance.</p>
            
            <p>A capsule wardrobe is a curated collection of highly versatile, classic pieces that can be easily combined with one another. It typically consists of 30 to 40 essentials—such as a tailored white shirt, structured blazer, timeless denim, and quality knitwear.</p>
            
            <h3>How to Start Your Capsule Wardrobe:</h3>
            <ol>
                <li><strong>Assess your lifestyle:</strong> Look at your day-to-day activities. Do you spend most of your time in corporate settings, casual layouts, or active spaces? Your wardrobe must reflect your reality, not an idealized version of it.</li>
                <li><strong>Choose a cohesive color palette:</strong> Stick to neutral bases like black, navy, grey, and camel, and select one or two accent colors that complement them. This ensures every piece can mix and match effortlessly.</li>
                <li><strong>Invest in quality over quantity:</strong> It is better to have one premium wool coat that lasts ten years than three synthetic ones that wear out in a single season. Pay attention to fabric compositions—look for silk, organic cotton, linen, and wool.</li>
            </ol>
            
            <p>Remember, minimalism is not about deprivation. It is about creating space for what truly matters, ensuring you start every single day feeling confident and comfortable in what you wear.</p>
        `
    },
    {
        title: 'Summer Trends: lightweight fabrics and soft palettes',
        slug: 'summer-trends-lightweight-fabrics-and-soft-palettes',
        category: 'Trends',
        createdAt: '2026-07-05T00:00:00Z',
        excerpt: 'From organic linen to breathable cotton blends, explore the textures and light colors that will keep you cool and elegant all summer long.',
        image: 'https://images.unsplash.com/photo-1509319117193-57bab727e09d?q=80&w=800&auto=format&fit=crop',
        readTime: '4 min read',
        author: 'Admin',
        isActive: true,
        content: `
            <p>As summer reaches its peak, our wardrobe demands a shift towards breathability and ease without sacrificing style. This season, fashion embraces raw, natural textures and soft, sun-washed color palettes that feel effortless.</p>
            
            <p>The secret to summer styling is fabric selection. Synthetic fibers like polyester trap heat and moisture, whereas natural materials allow air to flow freely. Let's look at the absolute essentials for this hot season.</p>
            
            <h3>The Pillars of Summer Comfort:</h3>
            <ul>
                <li><strong>Pure Organic Linen:</strong> Known for its signature relaxed drape and visible weave, linen is the ultimate summer fabric. A linen button-down shirt paired with tailored shorts creates an instant, elegant look.</li>
                <li><strong>Lighweight Cotton:</strong> Cotton is a staple, but this season favors fine knits, poplins, and organic voile. They feel featherlight against the skin.</li>
                <li><strong>Soft Earthy Palettes:</strong> Think off-whites, muted olives, soft sages, sandy beige, and pastel blues. These shades not only reflect sunlight better than dark hues but also project a serene, chic aesthetic.</li>
            </ul>
            
            <p>Opt for relaxed silhouettes that allow movement. Wide-leg linen trousers and oversized shirts are modern classics that keep you elegant throughout hot summer afternoons and relaxed evening dinners.</p>
        `
    },
    {
        title: 'Sourcing Sustainably: what goes into eco-luxury',
        slug: 'sourcing-sustainably-what-goes-into-eco-luxury',
        category: 'Sustainability',
        createdAt: '2026-06-28T00:00:00Z',
        excerpt: 'An inside look at our ethical manufacturing partnerships and our commitment to sourcing certified organic and recycled raw materials.',
        image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800&auto=format&fit=crop',
        readTime: '7 min read',
        author: 'Admin',
        isActive: true,
        content: `
            <p>True luxury lies in the details—including the story behind how a garment is created. Today, eco-luxury represents the pinnacle of craftsmanship, proving that premium design can coexist with environmental stewardship.</p>
            
            <p>At Envogue, sustainability is not a marketing buzzword; it is the blueprint of our production. We trace our supply chain from the raw cotton fields to the final sewing rooms, ensuring everyone involved is treated with dignity and respect.</p>
            
            <h3>Our Sustainability Standards:</h3>
            <p>We focus on three primary pillars of eco-responsible manufacturing:</p>
            <ol>
                <li><strong>Certified Organic Materials:</strong> Our garments use GOTS-certified organic cotton, which consumes 91% less water than conventional cotton and uses absolutely no toxic pesticides.</li>
                <li><strong>Circular Materials:</strong> We incorporate recycled wool and ocean-bound plastics transformed into premium durable yarns for our hardware and linings.</li>
                <li><strong>Zero-Waste Production:</strong> By utilizing advanced 3D knitting technology and low-impact dyes, we optimize our design phases to produce virtually zero waste.</li>
            </ol>
            
            <p>Investing in eco-luxury is a choice to respect the earth while enjoying outstanding design and quality. It is fashion you can feel good about owning for a lifetime.</p>
        `
    }
];

const seedBlogs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        
        console.log('Connected to MongoDB');
        
        const count = await Blog.countDocuments();
        if (count === 0) {
            console.log('No blogs found, seeding data...');
            await Blog.insertMany(MOCK_POSTS);
            console.log('Blogs seeded successfully!');
        } else {
            console.log('Blogs already exist in DB. Skipping seed.');
        }

        process.exit();
    } catch (error) {
        console.error('Error with seed:', error);
        process.exit(1);
    }
};

seedBlogs();
