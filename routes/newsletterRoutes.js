const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');
const { protect, admin } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Check if already subscribed
        const existingSubscriber = await Newsletter.findOne({ email });

        if (existingSubscriber) {
            return res.status(400).json({ message: 'Email is already subscribed to the newsletter.' });
        }

        const subscriber = new Newsletter({ email });
        await subscriber.save();

        res.status(201).json({ message: 'Successfully subscribed to the newsletter!' });
    } catch (error) {
        console.error('Newsletter subscribe error:', error);
        res.status(500).json({ message: 'Failed to subscribe. Please try again later.' });
    }
});

// @route   GET /api/newsletter
// @desc    Get all newsletter subscribers
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const subscribers = await Newsletter.find({}).sort({ createdAt: -1 });
        res.json(subscribers);
    } catch (error) {
        console.error('Newsletter get error:', error);
        res.status(500).json({ message: 'Failed to get subscribers' });
    }
});

// @route   DELETE /api/newsletter/:id
// @desc    Delete a subscriber
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const subscriber = await Newsletter.findById(req.params.id);

        if (subscriber) {
            await subscriber.deleteOne();
            res.json({ message: 'Subscriber removed' });
        } else {
            res.status(404).json({ message: 'Subscriber not found' });
        }
    } catch (error) {
        console.error('Newsletter delete error:', error);
        res.status(500).json({ message: 'Failed to delete subscriber' });
    }
});

// @route   POST /api/newsletter/send
// @desc    Send broadcast email to all subscribers
// @access  Private/Admin
router.post('/send', protect, admin, async (req, res) => {
    try {
        const { subject, message, productLink } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ message: 'Subject and message are required' });
        }

        const subscribers = await Newsletter.find({ isActive: true });
        
        if (subscribers.length === 0) {
            return res.status(400).json({ message: 'No active subscribers found to send email to.' });
        }

        let successCount = 0;
        let failCount = 0;

        for (const sub of subscribers) {
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h2 style="color: #f28b00;">${subject}</h2>
                    <div style="font-size: 16px; line-height: 1.5; margin-bottom: 25px; white-space: pre-wrap;">${message}</div>
                    ${productLink ? `
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="${productLink}" style="background-color: #f28b00; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">View Offer / Product</a>
                        </div>
                    ` : ''}
                    <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">You are receiving this email because you subscribed to our newsletter.</p>
                </div>
            `;

            try {
                await sendEmail({
                    email: sub.email,
                    subject: subject,
                    message: message,
                    html: htmlContent
                });
                successCount++;
            } catch (err) {
                console.error(`Failed to send to ${sub.email}:`, err);
                failCount++;
            }
        }

        res.json({ 
            message: `Newsletter sent successfully! Sent: ${successCount}, Failed: ${failCount}`,
            sent: successCount,
            failed: failCount
        });

    } catch (error) {
        console.error('Newsletter broadcast error:', error);
        res.status(500).json({ message: 'Failed to send broadcast email' });
    }
});

module.exports = router;
