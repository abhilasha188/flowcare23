const mongoose = require('mongoose');

const cycleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    flowIntensity: {
      type: String,
      enum: ['light', 'medium', 'heavy', null],
      default: null,
    },
    notes: {
      type: String,
      maxlength: 500,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
);

cycleSchema.index({ userId: 1, startDate: 1 }, { unique: true });

module.exports = mongoose.model('Cycle', cycleSchema);
