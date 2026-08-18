const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('post', 'title')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ success: true, unread: notifications.filter(n => !n.read).length, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, { read: true }, { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

module.exports = router;
