// ==========================================
// Post Routes - CRUD operations for posts
// Handles: Create, Read, Update, Delete posts
// ==========================================
const express = require('express');
const Post = require('../models/Post');
const Response = require('../models/Response');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize, ADMIN_ROLES } = require('../middleware/auth');

const router = express.Router();

// Public newspaper feed. Anyone can read active campus stories without
// signing in; authentication is still required for student actions.
router.get('/public', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const posts = await Post.find({ isActive: true })
      .populate('postedBy', 'name prefix department role')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, count: posts.length, posts });
  } catch (error) {
    console.error('Public newspaper feed error:', error);
    res.status(500).json({ success: false, message: 'Failed to load the public newspaper' });
  }
});

// ==========================================
// ROUTE: GET /api/posts
// Get all active posts with filters
// Access: Private (all authenticated users)
// Query Params: type, search, country
// ==========================================
router.get('/', protect, async (req, res) => {
  try {
    const { type, search, country } = req.query;

    // Build query
    const query = { isActive: true };

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by country
    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }

    // Search across multiple fields
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { university: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with populated user data
    const posts = await Post.find(query)
      .populate('postedBy', 'name email department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: GET /api/posts/:id
// Get single post by ID
// Access: Private
// ==========================================
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('postedBy', 'name email department role');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment view count
    post.views += 1;
    await post.save();

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Get post error:', error);

    // Handle invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: POST /api/posts
// Create a new post
// Access: Private (Teacher/Admin only)
// ==========================================
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      country,
      university,
      deadline,
      eligibility,
      duration,
      funding
    } = req.body;

    // ==========================================
    // Validation
    // ==========================================
    if (!title || !description || !type || !university || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, description, type, university, deadline'
      });
    }

    // Validate type
    const validTypes = ['MOU', 'Opportunity', 'Internship', 'Exchange Program', 'Conference', 'Workshop', 'Research', 'Event', 'Volunteer', 'Announcement', 'Achievement'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate deadline is in future
    const deadlineDate = new Date(deadline);
    if (!['Announcement', 'Achievement'].includes(type) && deadlineDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Deadline must be a future date'
      });
    }

    // ==========================================
    // Create post
    // ==========================================
    const post = await Post.create({
      title: title.trim(),
      description: description.trim(),
      type,
      country: country ? country.trim() : 'India',
      university: university.trim(),
      deadline: deadlineDate,
      eligibility: eligibility ? eligibility.trim() : 'Open to all eligible students',
      duration: duration ? duration.trim() : '',
      funding: funding ? funding.trim() : '',
      postedBy: req.user._id,
      postedByName: req.user.name,
      postedByDepartment: req.user.department || ''
    });

    const studentIds = await User.find({ role: 'student', isActive: true }).distinct('_id');
    if (studentIds.length) {
      await Notification.insertMany(studentIds.map(student => ({
        user: student,
        type: 'info',
        post: post._id,
        message: `New ${type} published: “${post.title}”.`
      })));
    }

    const teacherIds = await User.find({
      role: 'teacher',
      isActive: true,
      _id: { $ne: req.user._id }
    }).distinct('_id');
    if (teacherIds.length) {
      await Notification.insertMany(teacherIds.map(teacher => ({
        user: teacher,
        type: 'info',
        post: post._id,
        message: `New information posted by another teacher: “${post.title}”.`
      })));
    }

    // Populate user data for response
    await post.populate('postedBy', 'name email department');

    res.status(201).json({
      success: true,
      message: 'Post created successfully!',
      post
    });
  } catch (error) {
    console.error('Create post error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: PUT /api/posts/:id
// Update an existing post
// Access: Private (Owner/Admin only)
// ==========================================
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    // Find the post
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership (admin-equivalent roles can update any post)
    if (post.postedBy.toString() !== req.user._id.toString() && !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own posts'
      });
    }

    // ==========================================
    // Validate deadline if being updated
    // ==========================================
    if (req.body.deadline) {
      const newDeadline = new Date(req.body.deadline);
      if (newDeadline <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Deadline must be a future date'
        });
      }
      req.body.deadline = newDeadline;
    }

    // Fields that can be updated
    const allowedUpdates = [
      'title', 'description', 'type', 'country', 'university',
      'deadline', 'eligibility', 'duration', 'funding', 'isActive'
    ];

    // Only update allowed fields
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
    });

    // Update post
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('postedBy', 'name email department');

    res.json({
      success: true,
      message: 'Post updated successfully!',
      post: updatedPost
    });
  } catch (error) {
    console.error('Update post error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: DELETE /api/posts/:id
// Soft delete a post (sets isActive to false)
// Access: Private (Owner/Admin only)
// ==========================================
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.postedBy.toString() !== req.user._id.toString() && !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    // Soft delete (set isActive to false)
    post.isActive = false;
    await post.save();

    const studentIds = await Response.find({ post: post._id }).distinct('student');
    if (studentIds.length) {
      await Notification.insertMany(studentIds.map(student => ({
        user: student,
        type: 'post-deleted',
        post: post._id,
        message: `The opportunity “${post.title}” has been withdrawn by the publisher.`
      })));
    }

    // Also soft delete all responses for this post
    // await Response.updateMany({ post: post._id }, { isActive: false });

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: GET /api/posts/teacher/my-posts
// Get posts created by logged-in teacher
// Access: Private (Teacher/Admin)
// ==========================================
router.get('/teacher/my-posts', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    // Keep inactive (soft-deleted) posts visible to their owner so teachers
    // can still review responses that were submitted before deletion.
    const postQuery = ADMIN_ROLES.includes(req.user.role)
      ? {}
      : { postedBy: req.user._id };
    const posts = await Post.find(postQuery).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('Get my posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your posts',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: GET /api/posts/:id/stats
// Get statistics for a specific post
// Access: Private (Owner/Admin)
// ==========================================
router.get('/:id/stats', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.postedBy.toString() !== req.user._id.toString() && !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view stats'
      });
    }

    // Get response statistics
    const Response = require('../models/Response');
    const stats = await Response.getPostStats(post._id);

    res.json({
      success: true,
      stats: {
        ...stats,
        views: post.views,
        isExpired: post.isExpired,
        daysLeft: post.daysUntilDeadline
      }
    });
  } catch (error) {
    console.error('Get post stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post statistics',
      error: error.message
    });
  }
});

// ==========================================
// Export the router
// ==========================================_
module.exports = router;
