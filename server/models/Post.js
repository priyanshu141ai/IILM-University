// ==========================================
// Post Model - Defines opportunity/MOU posts
// ==========================================
const mongoose = require('mongoose');

// ==========================================
// Post Schema Definition
// ==========================================
const postSchema = new mongoose.Schema({
  // Title of the opportunity
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [150, 'Title cannot exceed 150 characters']
  },

  // Detailed description of the opportunity
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [3000, 'Description cannot exceed 3000 characters']
  },

  // Type of opportunity
  type: {
    type: String,
    enum: {
      values: ['MOU', 'Opportunity', 'Internship', 'Exchange Program', 'Conference', 'Workshop', 'Research', 'Event', 'Volunteer', 'Announcement', 'Achievement'],
      message: '{VALUE} is not a valid post type'
    },
    required: [true, 'Type is required']
  },

  // Country where the opportunity is located
  country: {
    type: String,
    trim: true,
    default: 'India'
  },

  // University or organization offering the opportunity
  university: {
    type: String,
    required: [true, 'University/Organization is required'],
    trim: true,
    maxlength: [200, 'University name cannot exceed 200 characters']
  },

  // Application deadline
  deadline: {
    type: Date,
    required: [true, 'Deadline is required'],
    validate: {
      validator: function(value) {
        // Deadline must be in the future
        return ['Announcement', 'Achievement'].includes(this.type) || value > Date.now();
      },
      message: 'Deadline must be a future date'
    }
  },

  // Eligibility criteria (free text)
  eligibility: {
    type: String,
    trim: true,
    default: 'Open to all eligible students',
    maxlength: [500, 'Eligibility cannot exceed 500 characters']
  },

  // Duration of the program (e.g., "3 months", "1 year")
  duration: {
    type: String,
    trim: true,
    default: ''
  },

  // Funding/Stipend information (e.g., "$1000/month", "Fully funded")
  funding: {
    type: String,
    trim: true,
    default: ''
  },

  // File attachments (PDFs, brochures, etc.)
  attachments: [{
    filename: String,
    originalName: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Reference to the user who posted this (teacher/admin)
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Posted by user is required']
  },

  // Name of the poster (cached for quick display)
  postedByName: {
    type: String,
    required: true
  },

  // Department of the poster (cached)
  postedByDepartment: {
    type: String,
    default: ''
  },

  // Whether the post is active and visible to students
  isActive: {
    type: Boolean,
    default: true
  },

  // Number of students who have responded
  responseCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Number of times this post has been viewed
  views: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  // Automatically add createdAt and updatedAt
  timestamps: true,

  // Custom JSON output
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// Indexes for better query performance
// ==========================================

// Text index for search functionality
postSchema.index({ title: 'text', description: 'text', university: 'text' });

// Compound index for common queries
postSchema.index({ type: 1, isActive: 1, deadline: 1 });
postSchema.index({ country: 1, isActive: 1 });
postSchema.index({ postedBy: 1, isActive: 1 });
postSchema.index({ createdAt: -1 });

// ==========================================
// Virtual Properties
// ==========================================

// Check if post has expired
postSchema.virtual('isExpired').get(function() {
  return this.deadline < new Date();
});

// Check if post is open for responses
postSchema.virtual('isOpen').get(function() {
  return this.isActive && this.deadline > new Date();
});

// Days until deadline
postSchema.virtual('daysUntilDeadline').get(function() {
  const now = new Date();
  const diff = this.deadline - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Get the poster's full details
postSchema.virtual('poster', {
  ref: 'User',
  localField: 'postedBy',
  foreignField: '_id',
  justOne: true
});

// ==========================================
// Pre-save Middleware
// ==========================================

// Validate deadline before saving
postSchema.pre('save', function(next) {
  // If updating deadline, check it's in future
  if (this.isModified('deadline') && !['Announcement', 'Achievement'].includes(this.type) && this.deadline <= new Date()) {
    const error = new Error('Deadline must be a future date');
    return next(error);
  }
  next();
});

// ==========================================
// Instance Methods
// ==========================================

// Increment view count
postSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
  return this.views;
};

// Increment response count
postSchema.methods.incrementResponses = async function() {
  this.responseCount += 1;
  await this.save();
  return this.responseCount;
};

// Decrement response count
postSchema.methods.decrementResponses = async function() {
  if (this.responseCount > 0) {
    this.responseCount -= 1;
    await this.save();
  }
  return this.responseCount;
};

// Check if a user can respond to this post
postSchema.methods.canRespond = function() {
  return this.isActive && this.deadline > new Date();
};

// Get summary for listing pages
postSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    type: this.type,
    university: this.university,
    country: this.country,
    deadline: this.deadline,
    responseCount: this.responseCount,
    views: this.views,
    isActive: this.isActive,
    postedByName: this.postedByName,
    isExpired: this.isExpired,
    daysLeft: this.daysUntilDeadline
  };
};

// ==========================================
// Static Methods
// ==========================================

// Find all active posts
postSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

// Find posts by type
postSchema.statics.findByType = function(type) {
  return this.find({ type, isActive: true }).sort({ createdAt: -1 });
};

// Find posts by user
postSchema.statics.findByUser = function(userId) {
  return this.find({ postedBy: userId, isActive: true }).sort({ createdAt: -1 });
};

// Find expiring soon (within X days)
postSchema.statics.findExpiringSoon = function(days = 7) {
  const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.find({
    isActive: true,
    deadline: { $lte: futureDate, $gt: new Date() }
  }).sort({ deadline: 1 });
};

// Search posts
postSchema.statics.search = function(query) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { university: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { country: { $regex: query, $options: 'i' } }
        ]
      }
    ]
  }).sort({ createdAt: -1 });
};

// ==========================================
// Post Query Helpers
// ==========================================

// Query helper for active posts only
postSchema.query.active = function() {
  return this.where({ isActive: true });
};

// Query helper for non-expired posts
postSchema.query.notExpired = function() {
  return this.where({ deadline: { $gt: new Date() } });
};

// ==========================================
// Export the Post Model
// ==========================================
module.exports = mongoose.model('Post', postSchema);
