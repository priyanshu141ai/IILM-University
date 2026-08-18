// ==========================================
// User Model - Defines user schema and methods
// ==========================================
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ==========================================
// User Schema Definition
// ==========================================
const userSchema = new mongoose.Schema({
  prefix: {
    type: String,
    enum: ['', 'Dr.', 'Mr.', 'Ms.', 'Mrs.'],
    default: ''
  },
  // Full name of the user
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  // Email address (unique identifier)
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },

  // Hashed password (never store plain text!)
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false  // Don't return password by default in queries
  },

  // User role - determines access permissions
  role: {
    type: String,
    enum: {
      // Preserve existing roles for backward compatibility and add new roles
      values: ['student', 'teacher', 'admin', 'ir_admin', 'super_admin'],
      message: '{VALUE} is not a valid role. Use student, teacher, admin, ir_admin, or super_admin.'
    },
    required: [true, 'Role is required']
  },

  // Department the user belongs to
  department: {
    type: String,
    trim: true,
    default: ''
  },

  // Student ID (only for students)
  studentId: {
    type: String,
    trim: true,
    default: ''
  },

  // Employee ID (only for teachers)
  employeeId: {
    type: String,
    trim: true,
    default: ''
  },

  // Contact phone number
  phone: {
    type: String,
    trim: true,
    default: ''
  },

  // Account status (admin can deactivate)
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  // Automatically add createdAt and updatedAt fields
  timestamps: true
});

// ==========================================
// Indexes for better query performance
// ==========================================
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// ==========================================
// Pre-save Middleware: Hash password before saving
// ==========================================
userSchema.pre('save', async function(next) {
  // Only hash the password if it's new or being modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt (random string) for extra security
    const salt = await bcrypt.genSalt(12);

    // Hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Instance Method: Compare password for login
// ==========================================
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Compare the provided password with the hashed password
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// ==========================================
// Instance Method: Get public profile (safe data only)
// ==========================================
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    department: this.department,
    studentId: this.studentId,
    employeeId: this.employeeId,
    phone: this.phone,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

// ==========================================
// Static Method: Find user by email
// ==========================================
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// ==========================================
// Virtual Property: Full user info (without sensitive data)
// ==========================================
userSchema.virtual('displayInfo').get(function() {
  if (this.role === 'student') {
    return `${this.name} (${this.studentId})`;
  } else if (this.role === 'teacher') {
    return `${this.name} (${this.employeeId})`;
  }
  return this.name;
});

// Ensure virtuals are included in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// ==========================================
// Export the User Model
// ==========================================
module.exports = mongoose.model('User', userSchema);
