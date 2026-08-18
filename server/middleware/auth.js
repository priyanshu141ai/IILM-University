// ==========================================
// Authentication & Authorization Middleware
// ==========================================
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Roles that are considered administrative-level (admin-equivalent)
const ADMIN_ROLES = ['admin', 'ir_admin', 'super_admin'];

// ==========================================
// Middleware: Verify JWT Token (Authentication)
// ==========================================
const protect = async (req, res, next) => {
  try {
    let token;

    // ==========================================
    // Extract token from Authorization header
    // ==========================================
    // Expected format: "Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided. Please log in.'
      });
    }

    // ==========================================
    // Verify token validity
    // ==========================================
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please log in again.'
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please log in again.'
        });
      }
      throw jwtError;
    }

    // ==========================================
    // Find user from token payload
    // ==========================================
    const user = await User.findById(decoded.id);

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // ==========================================
    // Attach user to request object
    // ==========================================
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;

    // Continue to next middleware/route handler
    next();

  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Please try again.'
    });
  }
};

// ==========================================
// Middleware: Role-based Access Control
// ==========================================
// Usage: authorize('admin') or authorize('student', 'teacher')
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // If 'admin' is among the allowed roles, expand it to include all ADMIN_ROLES
    let effectiveAllowed = [...allowedRoles];
    if (allowedRoles.includes('admin')) {
      effectiveAllowed = Array.from(new Set([...effectiveAllowed, ...ADMIN_ROLES]));
    }

    // Check if user's role is allowed
    if (!effectiveAllowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires one of these roles: ${effectiveAllowed.join(', ')}. Your role: ${req.user.role}.`
      });
    }

    // User has required role, continue
    next();
  };
};

// ==========================================
// Middleware: Check if user is Admin
// ==========================================
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrators only.'
    });
  }

  next();
};

// ==========================================
// Middleware: Check if user is Teacher or Admin
// ==========================================
const teacherOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  // Allow teacher or any admin-equivalent role
  if (!(['teacher', ...ADMIN_ROLES].includes(req.user.role))) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teachers and administrators only.'
    });
  }

  next();
};

// ==========================================
// Middleware: Check if user is Student
// ==========================================
const studentOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Students only.'
    });
  }

  next();
};

// ==========================================
// Middleware: Check Resource Ownership
// ==========================================
// Verifies if the current user owns the resource
// or has admin privileges
const checkOwnership = (resourceUserField = 'postedBy') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Admin-equivalent roles can access any resource
    if (ADMIN_ROLES.includes(req.user.role)) {
      return next();
    }

    // Get the resource from request (usually set by previous middleware)
    const resource = req.resource || req.post || req.response;

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    // Check if user owns the resource
    const ownerId = resource[resourceUserField];
    if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own resources.'
      });
    }

    next();
  };
};

// ==========================================
// Middleware: Optional Authentication
// ==========================================
// Sets req.user if token is valid, but doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // No token, but that's okay - continue without user
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
        req.userRole = user.role;
      } else {
        req.user = null;
      }
    } catch (err) {
      // Invalid token, but continue without user
      req.user = null;
    }

    next();
  } catch (error) {
    next();
  }
};

// ==========================================
// Utility: Generate JWT Token
// ==========================================
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// ==========================================
// Utility: Verify Token (without middleware)
// ==========================================
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// ==========================================
// Export all middleware functions
// ==========================================
module.exports = {
  protect,
  authorize,
  adminOnly,
  teacherOrAdmin,
  studentOnly,
  checkOwnership,
  optionalAuth,
  generateToken,
  verifyToken,
  // Export admin roles for use in other modules
  ADMIN_ROLES
};
