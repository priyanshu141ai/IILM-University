const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['status', 'post-deleted', 'info'], default: 'info' },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  read: { type: Boolean, default: false, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
