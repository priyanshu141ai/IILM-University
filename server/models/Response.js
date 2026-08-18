// ==========================================
// Response Model - Student responses to posts
// ==========================================
const mongoose = require('mongoose');

// ==========================================
// Response Schema Definition
// ==========================================
const responseSchema = new mongoose.Schema({
  // Reference to the post being responded to
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post reference is required']
  },

  // Reference to the student responding
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },

  // Cached student details (for quick display without joins)
  studentName: {
    type: String,
    required: true
  },

  studentEmail: {
    type: String,
    required: true
  },

  studentId: {
    type: String,
    default: ''
  },

  department: {
    type: String,
    default: ''
  },

  phone: {
    type: String,
    default: ''
  },

  // Student's message/cover letter
  message: {
    type: String,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters'],
    default: ''
  },

  // Current status of this response
  status: {
    type: String,
    enum: {
      values: ['Interested', 'Applied', 'Shortlisted', 'Selected', 'Rejected', 'Withdrawn'],
      message: '{VALUE} is not a valid status'
    },
    default: 'Interested'
  }
}, {
  // Automatically add createdAt and updatedAt
  timestamps: true,

  // Include virtuals in JSON output
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// Compound Unique Index
// Prevents same student from responding twice to same post
// ==========================================
responseSchema.index({ post: 1, student: 1 }, { unique: true });

// ==========================================
// Additional Indexes for Performance
// ==========================================
responseSchema.index({ student: 1, createdAt: -1 });
responseSchema.index({ post: 1, status: 1 });
responseSchema.index({ status: 1, createdAt: -1 });

// ==========================================
// Virtual Properties
// ==========================================

// Get the post details (virtual populate)
responseSchema.virtual('postDetails', {
  ref: 'Post',
  localField: 'post',
  foreignField: '_id',
  justOne: true
});

// Get the student details (virtual populate)
responseSchema.virtual('studentDetails', {
  ref: 'User',
  localField: 'student',
  foreignField: '_id',
  justOne: true
});

// Check if response is still active
responseSchema.virtual('isActive').get(function() {
  return !['Withdrawn', 'Rejected'].includes(this.status);
});

// Check if response is in final state
responseSchema.virtual('isFinal').get(function() {
  return ['Selected', 'Rejected', 'Withdrawn'].includes(this.status);
});

// ==========================================
// Pre-save Middleware
// ==========================================

// Auto-populate cached student fields if not provided
responseSchema.pre('save', async function(next) {
  try {
    // If student info is missing, fetch from User model
    if (this.isModified('student') && (!this.studentName || !this.studentEmail)) {
      const User = mongoose.model('User');
      const user = await User.findById(this.student);
      if (user) {
        this.studentName = this.studentName || user.name;
        this.studentEmail = this.studentEmail || user.email;
        this.studentId = this.studentId || user.studentId;
        this.department = this.department || user.department;
        if (!this.phone) this.phone = user.phone;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Instance Methods
// ==========================================

// Update status with timestamp tracking
responseSchema.methods.updateStatus = async function(newStatus) {
  const validStatuses = ['Interested', 'Applied', 'Shortlisted', 'Selected', 'Rejected', 'Withdrawn'];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  this.status = newStatus;
  await this.save();
  return this;
};

// Check if status can be changed
responseSchema.methods.canChangeStatus = function() {
  return !this.isFinal;
};

// Withdraw this response
responseSchema.methods.withdraw = async function() {
  this.status = 'Withdrawn';
  await this.save();
  return this;
};

// Get summary for display
responseSchema.methods.getSummary = function() {
  return {
    id: this._id,
    postId: this.post,
    studentName: this.studentName,
    studentId: this.studentId,
    department: this.department,
    status: this.status,
    createdAt: this.createdAt,
    isActive: this.isActive
  };
};

// ==========================================
// Static Methods
// ==========================================

// Find all responses for a specific post
responseSchema.statics.findByPost = function(postId) {
  return this.find({ post: postId }).sort({ createdAt: -1 });
};

// Find all responses by a specific student
responseSchema.statics.findByStudent = function(studentId) {
  return this.find({ student: studentId }).sort({ createdAt: -1 });
};

// Find responses by status
responseSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Count responses for a post
responseSchema.statics.countByPost = function(postId) {
  return this.countDocuments({ post: postId });
};

// Count responses by student
responseSchema.statics.countByStudent = function(studentId) {
  return this.countDocuments({ student: studentId });
};

// Get response statistics for a post
responseSchema.statics.getPostStats = async function(postId) {
  const stats = await this.aggregate([
    { $match: { post: new mongoose.Types.ObjectId(postId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Convert to object format
  const result = {
    total: 0,
    Interested: 0,
    Applied: 0,
    Shortlisted: 0,
    Selected: 0,
    Rejected: 0,
    Withdrawn: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Get response statistics for a student
responseSchema.statics.getStudentStats = async function(studentId) {
  const stats = await this.aggregate([
    { $match: { student: new mongoose.Types.ObjectId(studentId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    Interested: 0,
    Applied: 0,
    Shortlisted: 0,
    Selected: 0,
    Rejected: 0,
    Withdrawn: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Find recent responses
responseSchema.statics.findRecent = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('student', 'name email')
    .populate('post', 'title type');
};

// Check if student already responded to post
responseSchema.statics.hasResponded = async function(postId, studentId) {
  const response = await this.findOne({ post: postId, student: studentId });
  return !!response;
};

// ==========================================
// Query Helpers
// ==========================================

// Query helper for active responses only
responseSchema.query.active = function() {
  return this.where({ status: { $nin: ['Withdrawn', 'Rejected'] } });
};

// Query helper for pending responses (not yet final)
responseSchema.query.pending = function() {
  return this.where({ status: { $in: ['Interested', 'Applied', 'Shortlisted'] } });
};

// Query helper for successful responses
responseSchema.query.successful = function() {
  return this.where({ status: 'Selected' });
};

// ==========================================
// Post Middleware - Update counters
// ==========================================

// After a response is saved, increment post's response count
responseSchema.post('save', async function(doc) {
  try {
    const Post = mongoose.model('Post');
    const count = await mongoose.model('Response').countDocuments({ post: doc.post });
    await Post.findByIdAndUpdate(doc.post, { responseCount: count });
  } catch (error) {
    console.error('Error updating post response count:', error);
  }
});

// After a response is deleted, decrement post's response count
responseSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      const Post = mongoose.model('Post');
      const count = await mongoose.model('Response').countDocuments({ post: doc.post });
      await Post.findByIdAndUpdate(doc.post, { responseCount: count });
    } catch (error) {
      console.error('Error updating post response count:', error);
    }
  }
});

// After a response is deleted via deleteOne
responseSchema.post('deleteOne', async function(doc) {
  if (doc) {
    try {
      const Post = mongoose.model('Post');
      const count = await mongoose.model('Response').countDocuments({ post: doc.post });
      await Post.findByIdAndUpdate(doc.post, { responseCount: count });
    } catch (error) {
      console.error('Error updating post response count:', error);
    }
  }
});

// ==========================================
// Export the Response Model
// ==========================================
module.exports = mongoose.model('Response', responseSchema);
