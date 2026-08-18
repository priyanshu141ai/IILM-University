// ==========================================
// Authentication Routes
// Handles: Register, Login, Get current user
// ==========================================
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const Response = require('../models/Response');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// Helper: Generate JWT Token
// ==========================================
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// ==========================================
// Helper: Send user response (without password)
// ==========================================
const sendUserResponse = (user, res, statusCode, message) => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      prefix: user.prefix,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      studentId: user.studentId,
      employeeId: user.employeeId,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt
    }
  });
};

// ==========================================
// ROUTE: POST /api/auth/register
// Register a new user (Student/Teacher/Admin)
// Access: Public
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      prefix,
      email,
      password,
      role,
      department,
      studentId,
      employeeId,
      phone
    } = req.body;

    // ==========================================
    // Validation: Required fields
    // ==========================================
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, role'
      });
    }

    // ==========================================
    // Validation: Email format (college domain must be enforced)
    // Use COLLEGE_EMAIL_DOMAIN from environment if provided; fall back to iilm.edu
    // ==========================================
    const collegeDomain = (process.env.COLLEGE_EMAIL_DOMAIN || 'iilm.edu').replace(/^@?/, '');
    const emailRegex = new RegExp(`^[^\\s@]+@${collegeDomain}$`, 'i');
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: `Only @${collegeDomain} email addresses can be used to create an account`
      });
    }

    // ==========================================
    // Validation: Password strength
    // ==========================================
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // ==========================================
    // Validation: Role
    // Public registration may only create 'student' and 'teacher' accounts.
    // Reserved roles (admin, ir_admin, super_admin) must be provisioned by privileged admin
    // ==========================================
    const publicAllowedRoles = ['student', 'teacher'];

    if (!publicAllowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Role not allowed for public registration. Only student and teacher accounts can be created via this endpoint.'
      });
    }

    if (prefix && !['Dr.', 'Mr.', 'Ms.', 'Mrs.'].includes(prefix)) {
      return res.status(400).json({ success: false, message: 'Invalid name prefix' });
    }

    // ==========================================
    // Validation: Role-specific fields
    // ==========================================
    if (role === 'student' && !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required for student registration'
      });
    }

    if (role === 'teacher' && !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required for teacher registration'
      });
    }

    // ==========================================
    // Check if user already exists
    // ==========================================
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in instead.'
      });
    }

    // ==========================================
    // Check if student/employee ID already exists
    // ==========================================
    if (role === 'student' && studentId) {
      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'This Student ID is already registered'
        });
      }
    }

    if (role === 'teacher' && employeeId) {
      const existingEmployee = await User.findOne({ employeeId });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: 'This Employee ID is already registered'
        });
      }
    }

    // ==========================================
    // Create the user
    // (Password will be hashed by pre-save middleware)
    // ==========================================
    const user = await User.create({
      prefix: prefix || '',
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,  // Will be hashed automatically
      role,
      department: department ? department.trim() : '',
      studentId: role === 'student' ? studentId.trim() : '',
      employeeId: role === 'teacher' ? employeeId.trim() : '',
      phone: phone ? phone.trim() : ''
    });

    // Send success response with token
    sendUserResponse(user, res, 201, 'Account created successfully! Welcome to MOU Portal.');

  } catch (error) {
    console.error('Registration error:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `An account with this ${field} already exists`
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
      message: 'Registration failed. Please try again later.'
    });
  }
});

// ==========================================
// ROUTE: POST /api/auth/login
// Login user and return JWT token
// Access: Public
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ==========================================
    // Validation
    // ==========================================
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // ==========================================
    // Find user (include password for comparison)
    // ==========================================
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ==========================================
    // Check if account is active
    // ==========================================
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
    }

    // ==========================================
    // Compare password
    // ==========================================
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ==========================================
    // Send success response with token
    // ==========================================
    sendUserResponse(user, res, 200, `Welcome back, ${user.name}!`);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again later.'
    });
  }
});

// ==========================================
// ROUTE: GET /api/auth/me
// Get current logged-in user details
// Access: Private (requires authentication)
// ==========================================
router.get('/me', protect, async (req, res) => {
  try {
    // req.user is set by the protect middleware
    const user = req.user;

    res.json({
      success: true,
      user: {
        id: user._id,
        prefix: user.prefix,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: user.studentId,
        employeeId: user.employeeId,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details'
    });
  }
});

// ==========================================
// ROUTE: PUT /api/auth/update-profile
// Update current user's profile
// Access: Private
// ==========================================
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name, department, phone } = req.body;

    // Fields that can be updated
    const updates = {};
    if (name) updates.name = name.trim();
    if (department !== undefined) updates.department = department.trim();
    if (phone !== undefined) updates.phone = phone.trim();

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// ==========================================
// ROUTE: PUT /api/auth/change-password
// Change current user's password
// Access: Private
// ==========================================
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// ==========================================
// ROUTE: POST /api/auth/logout
// Logout user (client should delete token)
// Access: Private
// ==========================================
router.post('/logout', protect, (req, res) => {
  // In JWT, logout is handled client-side by deleting the token
  // This endpoint just confirms the action
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Deactivate the current teacher or student account.
router.put('/deactivate-account', protect, async (req, res) => {
  try {
    if (!['student', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only student and teacher accounts can be deactivated here.' });
    }

    req.user.isActive = false;
    await req.user.save();
    res.json({ success: true, message: 'Your account has been deactivated.' });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate account' });
  }
});

// Permanently delete the current teacher or student account and its owned data.
router.delete('/account', protect, async (req, res) => {
  try {
    if (!['student', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only student and teacher accounts can be deleted here.' });
    }

    if (req.user.role === 'student') {
      await Response.deleteMany({ student: req.user._id });
    } else {
      const posts = await Post.find({ postedBy: req.user._id }).select('_id');
      const postIds = posts.map(post => post._id);
      await Response.deleteMany({ post: { $in: postIds } });
      await Post.deleteMany({ postedBy: req.user._id });
    }

    await User.deleteOne({ _id: req.user._id });
    res.json({ success: true, message: 'Your account has been permanently deleted.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
});

// ==========================================
// ROUTE: GET /api/auth/verify-token
// Check if token is still valid
// Access: Private
// ==========================================
router.get('/verify-token', protect, (req, res) => {
  // If protect middleware passed, token is valid
  res.json({
    success: true,
    message: 'Token is valid',
    user: {
      id: req.user._id,
      name: req.user.name,
      role: req.user.role
    }
  });
});

// ==========================================
// Export the router
// ==========================================
module.exports = router;
