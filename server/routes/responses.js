// ==========================================
// Response Routes - Student responses to posts
// Handles: Submit, view, update, withdraw responses
// ==========================================
const express = require('express');
const Response = require('../models/Response');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { protect, authorize, ADMIN_ROLES } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// ROUTE: POST /api/responses
// Student submits a response to a post
// Access: Private (Student only)
// ==========================================
router.post('/', protect, authorize('student'), async (req, res) => {
  try {
    const { postId, message, phone } = req.body;

    // ==========================================
    // Validation
    // ==========================================
    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Post ID is required'
      });
    }

    // Check if post exists and is active
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (!post.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This post is no longer active'
      });
    }

    // Check if deadline has passed
    if (new Date(post.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'The deadline for this opportunity has passed'
      });
    }

    // Check if student already responded
    const existingResponse = await Response.findOne({
      post: postId,
      student: req.user._id
    });

    if (existingResponse) {
      return res.status(400).json({
        success: false,
        message: 'You have already responded to this opportunity'
      });
    }

    // ==========================================
    // Create the response
    // (Cached fields auto-populated by pre-save middleware)
    // ==========================================
    const response = await Response.create({
      post: postId,
      student: req.user._id,
      studentName: req.user.name,
      studentEmail: req.user.email,
      studentId: req.user.studentId,
      department: req.user.department,
      phone: phone || req.user.phone || '',
      message: message ? message.trim() : ''
    });

    // Populate the post using the real reference so every dashboard receives
    // the same response shape.
    await response.populate('post', 'title type university country deadline isActive');
    await response.populate('student', 'name email studentId department phone');

    res.status(201).json({
      success: true,
      message: 'Your response has been submitted successfully! 🎉',
      response
    });

  } catch (error) {
    console.error('Create response error:', error);

    // Handle duplicate key error (unique compound index)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already responded to this opportunity'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit response',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: GET /api/responses/post/:postId
// Get all responses for a specific post
// Access: Private (Teacher who posted / Admin)
// ==========================================
router.get('/post/:postId', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    // Find the post
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check authorization
    // Teacher can only see responses for their own posts
    // Admin can see responses for any post
    if (post.postedBy.toString() !== req.user._id.toString() && !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view responses for your own posts'
      });
    }

    // Get all responses for this post
    const responses = await Response.find({ post: req.params.postId })
      .populate('student', 'name email studentId department phone')
      .sort({ createdAt: -1 });

    // Get statistics
    const stats = await Response.getPostStats(req.params.postId);

    res.json({
      success: true,
      count: responses.length,
      postTitle: post.title,
      stats,
      responses
    });

  } catch (error) {
    console.error('Get post responses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch responses',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: GET /api/responses/my-responses
// Get all responses submitted by logged-in student
// Access: Private (Student only)
// ==========================================
router.get('/my-responses', protect, authorize('student'), async (req, res) => {
  try {
    const responses = await Response.find({ student: req.user._id })
      .populate('post', 'title type university country deadline isActive')
      .populate('student', 'name email studentId department phone')
      .sort({ createdAt: -1 });

    // Get statistics
    const stats = await Response.getStudentStats(req.user._id);

    res.json({
      success: true,
      count: responses.length,
      stats,
      responses
    });

  } catch (error) {
    console.error('Get my responses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your responses',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: PUT /api/responses/:id/status
// Update response status
// Access: Private (Teacher who owns post / Admin)
// ==========================================
router.put('/:id/status', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = ['Interested', 'Applied', 'Shortlisted', 'Selected', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find the response with post details
    const response = await Response.findById(req.params.id).populate('post');

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Response not found'
      });
    }

    // Check authorization
    if (response.post.postedBy.toString() !== req.user._id.toString() && !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update responses for your own posts'
      });
    }

    // Update status
    response.status = status;
    await response.save();

    await Notification.create({
      user: response.student,
      type: 'status',
      post: response.post._id,
      message: `Your response to “${response.post.title}” was updated to ${status}.`
    });

    // Populate student details for response
    await response.populate('student', 'name email studentId department');

    res.json({
      success: true,
      message: `Status updated to "${status}"`,
      response
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: DELETE /api/responses/admin/:id
// Admin force-deletes a response
// Access: Private (Admin only)
// ==========================================
router.delete('/admin/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const response = await Response.findByIdAndDelete(req.params.id);
    if (!response) return res.status(404).json({ success: false, message: 'Response not found' });
    res.json({ success: true, message: 'Response deleted by admin' });
  } catch (error) {
    console.error('Admin delete response error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete response', error: error.message });
  }
});

// ==========================================
// ROUTE: DELETE /api/responses/:id
// Student withdraws their response
// Access: Private (Student who submitted / Admin)
// ==========================================
router.delete('/:id', protect, authorize('student'), async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Response not found'
      });
    }

    // Check ownership
    if (response.student.toString() !== req.user._id.toString() && !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only withdraw your own responses'
      });
    }

    // Don't allow withdrawal of finalized responses
    if (['Selected', 'Rejected'].includes(response.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw a response that is already ${response.status.toLowerCase()}. Please contact the teacher.`
      });
    }

    // Delete the response
    await Response.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Response withdrawn successfully'
    });

  } catch (error) {
    console.error('Withdraw response error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw response',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: GET /api/responses/check/:postId
// Check if logged-in student has already responded
// Access: Private (Student only)
// ==========================================
router.get('/check/:postId', protect, authorize('student'), async (req, res) => {
  try {
    const hasResponded = await Response.hasResponded(
      req.params.postId,
      req.user._id
    );

    let response = null;
    if (hasResponded) {
      response = await Response.findOne({
        post: req.params.postId,
        student: req.user._id
      });
    }

    res.json({
      success: true,
      hasResponded,
      response
    });

  } catch (error) {
    console.error('Check response error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check response status',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: GET /api/responses/all
// Get all responses (Admin only)
// Access: Private (Admin only)
// ==========================================
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;

    // Get responses with pagination
    const responses = await Response.find(query)
      .populate('post', 'title type university country')
      .populate('student', 'name email studentId department phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Get total count
    const total = await Response.countDocuments(query);

    res.json({
      success: true,
      count: responses.length,
      total,
      responses
    });

  } catch (error) {
    console.error('Get all responses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch responses',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: PUT /api/responses/:id
// Update response message (by student)
// Access: Private (Student who submitted)
// ==========================================
router.put('/:id', protect, authorize('student'), async (req, res) => {
  try {
    const { message, phone } = req.body;

    const response = await Response.findById(req.params.id);

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Response not found'
      });
    }

    // Check ownership
    if (response.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own responses'
      });
    }

    // Don't allow updates to finalized responses
    if (['Selected', 'Rejected', 'Withdrawn'].includes(response.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update a response that is ${response.status.toLowerCase()}`
      });
    }

    // Update allowed fields
    if (message !== undefined) {
      if (message.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Message cannot exceed 1000 characters'
        });
      }
      response.message = message.trim();
    }

    if (phone !== undefined) {
      response.phone = phone.trim();
    }

    await response.save();

    res.json({
      success: true,
      message: 'Response updated successfully',
      response
    });

  } catch (error) {
    console.error('Update response error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update response',
      error: error.message
    });
  }
});

// ==========================================
// ROUTE: DELETE /api/responses/admin/:id
// Admin force-deletes a response
// Access: Private (Admin only)
// ==========================================
// ==========================================
// Export the router
// ==========================================
module.exports = router;
