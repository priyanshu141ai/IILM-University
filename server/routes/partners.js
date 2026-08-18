// ==========================================
// Partner Routes - Admin-protected CRUD for Partner institutions
// ==========================================
const express = require('express');
const Partner = require('../models/Partner');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes here are admin-only
router.use(protect, authorize('admin'));

// Create partner
router.post('/', async (req, res) => {
  try {
    const { name, country, city, website, contactPerson, contactEmail, contactPhone, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Partner name is required' });

    const partner = await Partner.create({
      name: name.trim(),
      country: country ? country.trim() : '',
      city: city ? city.trim() : '',
      website: website ? website.trim() : '',
      contactPerson: contactPerson ? contactPerson.trim() : '',
      contactEmail: contactEmail ? contactEmail.trim() : '',
      contactPhone: contactPhone ? contactPhone.trim() : '',
      notes: notes ? notes.trim() : '',
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, partner });
  } catch (error) {
    console.error('Create partner error:', error);
    res.status(500).json({ success: false, message: 'Failed to create partner', error: error.message });
  }
});

// List / search partners (admin)
router.get('/', async (req, res) => {
  try {
    const { search, country, archived } = req.query;
    const query = {};
    if (search) {
      query.$text = { $search: search };
    }
    if (country) query.country = { $regex: country, $options: 'i' };
    if (archived === 'true') query.isArchived = true;
    if (archived === 'false') query.isArchived = false;

    const partners = await Partner.find(query).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: partners.length, partners });
  } catch (error) {
    console.error('List partners error:', error);
    res.status(500).json({ success: false, message: 'Failed to list partners', error: error.message });
  }
});

// Update partner
router.put('/:id', async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

    const updates = ['name','country','city','website','contactPerson','contactEmail','contactPhone','notes','isArchived'];
    updates.forEach(f => { if (req.body[f] !== undefined) partner[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f]; });

    partner.updatedBy = req.user._id;
    await partner.save();
    res.json({ success: true, partner });
  } catch (error) {
    console.error('Update partner error:', error);
    res.status(500).json({ success: false, message: 'Failed to update partner', error: error.message });
  }
});

// Archive partner (soft-delete)
router.delete('/:id', async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
    partner.isArchived = true;
    partner.updatedBy = req.user._id;
    await partner.save();
    res.json({ success: true, message: 'Partner archived' });
  } catch (error) {
    console.error('Archive partner error:', error);
    res.status(500).json({ success: false, message: 'Failed to archive partner', error: error.message });
  }
});

module.exports = router;
