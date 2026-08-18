// ==========================================
// Opportunities Routes
// ==========================================
const express = require('express');
const mongoose = require('mongoose');
const Opportunity = require('../models/Opportunity');
const Partner = require('../models/Partner');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// GET /api/opportunities
// Listing with pagination, filters, search
// Access: protect (students/teachers/admin)
// ==========================================
router.get('/', protect, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 200);
    const skip = (page - 1) * limit;

    const {
      search, type, country, partner, status, deadlineRange, eligibleProgram, department, featured, sort
    } = req.query;

    const query = {};

    // Visibility rules: students and teachers see only Published (but admins can query any status)
    const isAdminRequest = req.user && req.user.role && (req.user.role === 'admin' || ['ir_admin','super_admin'].includes(req.user.role));
    if (!isAdminRequest) {
      query.status = 'Published';
    } else if (status) {
      // admins can filter by status
      query.status = status;
    }

    if (type) query.opportunityType = type;
    if (country) query.country = { $regex: country, $options: 'i' };
    if (partner && mongoose.Types.ObjectId.isValid(partner)) query.partnerInstitution = partner;
    if (typeof featured !== 'undefined') {
      if (featured === 'true') query.featured = true;
      if (featured === 'false') query.featured = false;
    }

    // Deadline range filters
    if (deadlineRange) {
      const now = new Date();
      if (deadlineRange === 'closing7') {
        const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        query.applicationDeadline = { $gte: now, $lte: future };
      } else if (deadlineRange === 'closing30') {
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        query.applicationDeadline = { $gte: now, $lte: future };
      } else if (deadlineRange === 'closing60') {
        const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        query.applicationDeadline = { $gte: now, $lte: future };
      } else if (deadlineRange === 'expired') {
        query.applicationDeadline = { $lt: new Date() };
      }
    }

    // Eligible program / department filters (simple array match)
    if (eligibleProgram) query.eligiblePrograms = { $in: [eligibleProgram] };
    if (department) query.eligibleDepartments = { $in: [department] };

    // Search - use text index if search provided
    if (search) {
      query.$text = { $search: search };
    }

    let cursor = Opportunity.find(query)
      .populate('partnerInstitution', 'name country city website')
      .skip(skip)
      .limit(limit);

    if (sort) {
      // allow sort=featured,-createdAt etc.
      const sortObj = {};
      sort.split(',').forEach(s => {
        const dir = s.startsWith('-') ? -1 : 1;
        const key = s.startsWith('-') ? s.substring(1) : s;
        sortObj[key] = dir;
      });
      cursor = cursor.sort(sortObj);
    } else {
      cursor = cursor.sort({ featured: -1, applicationDeadline: 1, createdAt: -1 });
    }

    const [items, total] = await Promise.all([
      cursor.exec(),
      Opportunity.countDocuments(query)
    ]);

    // Map computedStatus for each item and sanitize response fields
    const now = new Date();
    const results = items.map(op => {
      const obj = op.toObject();
      // computedStatus based on applicationDeadline and stored status
      let computedStatus = obj.status;
      if (obj.status === 'Published') {
        if (obj.applicationDeadline && new Date(obj.applicationDeadline) < now) computedStatus = 'Closed';
        else if (obj.applicationDeadline) {
          const diff = new Date(obj.applicationDeadline) - now;
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          if (days >= 0 && days <= 7) computedStatus = 'Closing Soon';
        }
      }
      obj.computedStatus = computedStatus;
      return obj;
    });

    res.json({ success: true, count: results.length, total, page, pageSize: limit, opportunities: results });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch opportunities', error: error.message });
  }
});

// ==========================================
// GET /api/opportunities/:id
// Get single opportunity
// Access: protect
// ==========================================
router.get('/:id', protect, async (req, res) => {
  try {
    const op = await Opportunity.findById(req.params.id).populate('partnerInstitution', 'name country city website');
    if (!op) return res.status(404).json({ success: false, message: 'Opportunity not found' });

    // Visibility: Students / Teachers can only view Published (except admins)
    const isAdmin = req.user && (req.user.role === 'admin' || ['ir_admin','super_admin'].includes(req.user.role));
    if (!isAdmin && op.status !== 'Published') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this opportunity' });
    }

    // Increment view counter? Not required here; leave for future.

    const obj = op.toObject();
    // attach computedStatus
    const now = new Date();
    let computedStatus = obj.status;
    if (obj.status === 'Published') {
      if (obj.applicationDeadline && new Date(obj.applicationDeadline) < now) computedStatus = 'Closed';
      else if (obj.applicationDeadline) {
        const diff = new Date(obj.applicationDeadline) - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 7) computedStatus = 'Closing Soon';
      }
    }
    obj.computedStatus = computedStatus;

    res.json({ success: true, opportunity: obj });
  } catch (error) {
    console.error('Get opportunity error:', error);
    if (error.kind === 'ObjectId') return res.status(404).json({ success: false, message: 'Opportunity not found' });
    res.status(500).json({ success: false, message: 'Failed to fetch opportunity', error: error.message });
  }
});

// ==========================================
// POST /api/opportunities
// Create opportunity (admin only)
// ==========================================
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const data = req.body || {};

    // Validate required fields
    if (!data.title || !data.opportunityType) return res.status(400).json({ success: false, message: 'title and opportunityType are required' });

    // Validate type enum
    const validTypes = Opportunity.schema.path('opportunityType').enumValues;
    if (!validTypes.includes(data.opportunityType)) return res.status(400).json({ success: false, message: `Invalid opportunity type` });

    // Validate dates
    if (data.applicationStartDate && data.applicationDeadline && new Date(data.applicationStartDate) > new Date(data.applicationDeadline)) {
      return res.status(400).json({ success: false, message: 'applicationStartDate must be before or equal to applicationDeadline' });
    }
    if (data.programStartDate && data.programEndDate && new Date(data.programStartDate) > new Date(data.programEndDate)) {
      return res.status(400).json({ success: false, message: 'programStartDate must be before or equal to programEndDate' });
    }

    // Validate partner if provided
    if (data.partnerInstitution) {
      if (!mongoose.Types.ObjectId.isValid(data.partnerInstitution)) return res.status(400).json({ success: false, message: 'Invalid partnerInstitution id' });
      const partner = await Partner.findById(data.partnerInstitution);
      if (!partner) return res.status(400).json({ success: false, message: 'Provided partnerInstitution not found' });
    }

    // Validate URL if provided (simple check)
    if (data.externalApplicationUrl && !/^https?:\/\//i.test(data.externalApplicationUrl)) {
      return res.status(400).json({ success: false, message: 'externalApplicationUrl must be a valid URL starting with http:// or https://' });
    }

    // Protect createdBy
    data.createdBy = req.user._id;
    data.updatedBy = req.user._id;
    if (data.status === 'Published') data.publishedAt = new Date();

    const op = await Opportunity.create(data);
    res.status(201).json({ success: true, opportunity: op });
  } catch (error) {
    console.error('Create opportunity error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Failed to create opportunity', error: error.message });
  }
});

// ==========================================
// PUT /api/opportunities/:id
// Update opportunity (admin only)
// ==========================================
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const op = await Opportunity.findById(req.params.id);
    if (!op) return res.status(404).json({ success: false, message: 'Opportunity not found' });

    const data = req.body || {};

    // Validate partner if provided
    if (data.partnerInstitution) {
      if (!mongoose.Types.ObjectId.isValid(data.partnerInstitution)) return res.status(400).json({ success: false, message: 'Invalid partnerInstitution id' });
      const partner = await Partner.findById(data.partnerInstitution);
      if (!partner) return res.status(400).json({ success: false, message: 'Provided partnerInstitution not found' });
    }

    // Validate URLs
    if (data.externalApplicationUrl && data.externalApplicationUrl.length && !/^https?:\/\//i.test(data.externalApplicationUrl)) {
      return res.status(400).json({ success: false, message: 'externalApplicationUrl must be a valid URL starting with http:// or https://' });
    }

    // If updating status to Published, set publishedAt
    if (data.status === 'Published' && op.status !== 'Published') {
      data.publishedAt = new Date();
    }

    // Protect updatedBy
    data.updatedBy = req.user._id;

    // Apply allowed updates only
    const allowed = Object.keys(Opportunity.schema.paths).filter(k => !['__v','_id','createdAt','createdBy','publishedAt'].includes(k));
    allowed.forEach(key => {
      if (data[key] !== undefined) op[key] = data[key];
    });

    // Save
    await op.save();
    res.json({ success: true, opportunity: op });
  } catch (error) {
    console.error('Update opportunity error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Failed to update opportunity', error: error.message });
  }
});

// ==========================================
// DELETE /api/opportunities/:id
// Soft-delete => set status = Archived (admin only)
// ==========================================
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const op = await Opportunity.findById(req.params.id);
    if (!op) return res.status(404).json({ success: false, message: 'Opportunity not found' });
    op.status = 'Archived';
    op.updatedBy = req.user._id;
    await op.save();
    res.json({ success: true, message: 'Opportunity archived' });
  } catch (error) {
    console.error('Archive opportunity error:', error);
    res.status(500).json({ success: false, message: 'Failed to archive opportunity', error: error.message });
  }
});

module.exports = router;
