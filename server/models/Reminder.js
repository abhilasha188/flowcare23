const mongoose = require('mongoose');
const reminderTypes = require('../utils/reminderTypes');

const reminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: reminderTypes, required: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    message: { type: String, trim: true, maxlength: 500, default: '' },
    scheduledAt: { type: Date, required: true },
    enabled: { type: Boolean, default: true },
    status: { type: String, enum: ['scheduled', 'dismissed'], default: 'scheduled' },
  },
  { timestamps: true },
);

reminderSchema.index({ userId: 1, scheduledAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
