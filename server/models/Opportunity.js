// ==========================================
// Opportunity Model - International Opportunities
// ==========================================
const mongoose = require('mongoose');

const ATTACHMENT_SCHEMA = {
  filename: String,
  originalName: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now }
};

const OPPORTUNITY_TYPES = [
  'International Internship',
  'Semester Exchange',
  'Student Exchange',
  'Study Abroad',
  'Scholarship',
  'Fellowship',
  'Summer School',
  'Winter School',
  'Research Opportunity',
  'International Competition',
  'Conference',
  'Other'
];

const STATUS_VALUES = ['Draft', 'Published', 'Closed', 'Archived'];

const opportunitySchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 300 },
  shortDescription: { type: String, trim: true, maxlength: 500 },
  description: { type: String, trim: true, default: '' },
  opportunityType: { type: String, enum: { values: OPPORTUNITY_TYPES, message: '{VALUE} is not a valid opportunity type' }, required: [true, 'Opportunity type is required'] },

  // Reference to Partner (optional)
  partnerInstitution: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },

  country: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },

  applicationStartDate: { type: Date },
  applicationDeadline: { type: Date },

  programStartDate: { type: Date },
  programEndDate: { type: Date },

  eligibilityCriteria: { type: String, trim: true, default: '' },
  eligiblePrograms: [{ type: String, trim: true }],
  eligibleDepartments: [{ type: String, trim: true }],
  eligibleYears: [{ type: String, trim: true }],
  minimumCGPA: { type: Number, min: 0, max: 10 },

  numberOfSeats: { type: Number, min: 0, default: 0 },

  fundingType: { type: String, trim: true, default: '' },
  fundingAmount: { type: String, trim: true, default: '' },
  isPaid: { type: Boolean, default: false },
  fees: { type: String, trim: true, default: '' },
  benefits: { type: String, trim: true, default: '' },

  requiredDocuments: [{ type: String, trim: true }],

  contactPerson: { type: String, trim: true, default: '' },
  contactEmail: { type: String, trim: true, default: '' },
  contactPhone: { type: String, trim: true, default: '' },

  applicationInstructions: { type: String, trim: true, default: '' },
  externalApplicationUrl: { type: String, trim: true, default: '' },

  // Reuse Post.attachments structure for documents
  documents: [ATTACHMENT_SCHEMA],

  status: { type: String, enum: { values: STATUS_VALUES, message: '{VALUE} is not a valid status' }, default: 'Draft' },
  featured: { type: Boolean, default: false },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  publishedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Text index for search
opportunitySchema.index({ title: 'text', shortDescription: 'text', description: 'text' });
// Other indexes
opportunitySchema.index({ status: 1 });
opportunitySchema.index({ opportunityType: 1 });
opportunitySchema.index({ country: 1 });
opportunitySchema.index({ applicationDeadline: 1 });
opportunitySchema.index({ featured: 1 });
opportunitySchema.index({ partnerInstitution: 1 });
opportunitySchema.index({ createdAt: -1 });

// Virtual computed status (does not persist)
opportunitySchema.virtual('computedStatus').get(function() {
  const now = new Date();
  if (this.status === 'Archived') return 'Archived';
  if (this.status === 'Draft') return 'Draft';
  if (this.status === 'Published') {
    if (this.applicationDeadline && this.applicationDeadline < now) return 'Closed';
    // Closing soon if within 7 days
    if (this.applicationDeadline) {
      const diff = this.applicationDeadline - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 7) return 'Closing Soon';
    }
    return 'Published';
  }
  return this.status;
});

// Pre-save validations
opportunitySchema.pre('save', function(next) {
  // applicationStartDate <= applicationDeadline
  if (this.applicationStartDate && this.applicationDeadline && this.applicationStartDate > this.applicationDeadline) {
    return next(new Error('Application start date must be before or equal to application deadline'));
  }
  // programStartDate <= programEndDate
  if (this.programStartDate && this.programEndDate && this.programStartDate > this.programEndDate) {
    return next(new Error('Program start date must be before or equal to program end date'));
  }
  next();
});

module.exports = mongoose.model('Opportunity', opportunitySchema);
