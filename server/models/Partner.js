// ==========================================
// Partner Model - Centralized international partner institutions
// ==========================================
const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Partner name is required'],
    trim: true,
    maxlength: [200, 'Partner name cannot exceed 200 characters']
  },
  country: {
    type: String,
    trim: true,
    default: ''
  },
  city: {
    type: String,
    trim: true,
    default: ''
  },
  website: {
    type: String,
    trim: true,
    default: ''
  },
  contactPerson: {
    type: String,
    trim: true,
    default: ''
  },
  contactEmail: {
    type: String,
    trim: true,
    default: ''
  },
  contactPhone: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
partnerSchema.index({ name: 'text', country: 1 });
partnerSchema.index({ isArchived: 1, createdAt: -1 });

module.exports = mongoose.model('Partner', partnerSchema);
