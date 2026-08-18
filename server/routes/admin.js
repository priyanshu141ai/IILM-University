const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Response = require('../models/Response');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect, authorize('admin'));

// Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalPosts, totalResponses] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      Post.countDocuments({ isActive: true }),
      Response.countDocuments()
    ]);

    const postsByType = await Post.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const recentPosts = await Post.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('postedBy', 'name email');

    const recentResponses = await Response.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('post', 'title')
      .populate('student', 'name email');

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalPosts,
        totalResponses,
        postsByType,
        recentPosts,
        recentResponses
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const filter = req.query.role ? { role: req.query.role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle user active status
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({
      success: true,
      user: { id: user._id, name: user.name, isActive: user.isActive }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all posts
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('postedBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: posts.length, posts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all responses
router.get('/responses', async (req, res) => {
  try {
    const responses = await Response.find()
      .populate('post', 'title type university')
      .populate('student', 'name email department studentId phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: responses.length, responses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
