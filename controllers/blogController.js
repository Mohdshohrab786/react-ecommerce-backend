const Blog = require('../models/Blog');

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find({}).sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
const getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (blog) {
            res.json(blog);
        } else {
            res.status(404).json({ message: 'Blog not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a blog
// @route   POST /api/blogs
// @access  Private/Admin
const createBlog = async (req, res) => {
    try {
        const blog = new Blog({
            title: 'Sample Blog Title',
            slug: `sample-blog-title-${Date.now()}`,
            image: '/images/sample-blog.jpg',
            category: 'Style',
            excerpt: 'Sample blog excerpt details...',
            content: 'Sample blog main content body goes here...',
            readTime: '5 min read',
            author: req.user.name || 'Admin',
            isActive: false
        });

        const createdBlog = await blog.save();
        res.status(201).json(createdBlog);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
const updateBlog = async (req, res) => {
    const { title, image, category, excerpt, content, readTime, author, isActive } = req.body;

    try {
        const blog = await Blog.findById(req.params.id);

        if (blog) {
            blog.title = title || blog.title;
            if (title) {
                blog.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            }
            blog.image = image || blog.image;
            blog.category = category || blog.category;
            blog.excerpt = excerpt || blog.excerpt;
            blog.content = content || blog.content;
            blog.readTime = readTime || blog.readTime;
            blog.author = author || blog.author;
            blog.isActive = isActive !== undefined ? isActive : blog.isActive;

            const updatedBlog = await blog.save();
            res.json(updatedBlog);
        } else {
            res.status(404).json({ message: 'Blog not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (blog) {
            await blog.deleteOne();
            res.json({ message: 'Blog removed' });
        } else {
            res.status(404).json({ message: 'Blog not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBlogs, getBlogById, createBlog, updateBlog, deleteBlog };
