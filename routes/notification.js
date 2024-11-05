const express = require('express');
const router = express.Router();

module.exports = (notificationService) => {
    // Get unread notifications
    router.get('/', async (req, res) => {
        try {
            const notifications = await notificationService.getUnreadNotifications();
            console.log('Sending notifications:', notifications); // Debug log
            res.json(notifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get notification count
    router.get('/count', async (req, res) => {
        try {
            const notifications = await notificationService.getUnreadNotifications();
            res.json({ count: notifications.length });
        } catch (error) {
            console.error('Error fetching notification count:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Mark single notification as read
    router.put('/:id/read', async (req, res) => {
        try {
            await notificationService.markAsRead(req.params.id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Mark all notifications as read
    router.put('/mark-all-read', async (req, res) => {
        try {
            await notificationService.markAllAsRead();
            res.json({ success: true });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};