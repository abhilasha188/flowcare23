const mongoose = require('mongoose');

const symptomItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    severity: { type: Number, required: true, min: 1, max: 10 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { _id: false },
);

const symptomSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: { type: Date, required: true },
    symptoms: { type: [symptomItemSchema], default: [] },
    mood: {
      type: String,
      enum: ['happy', 'calm', 'sad', 'irritated', 'anxious', 'stressed', 'energetic', 'low', 'emotional', null],
      default: null,
    },
    energyLevel: { type: Number, min: 1, max: 10, default: null },
    sleepQuality: { type: Number, min: 1, max: 10, default: null },
    flowIntensity: { type: String, enum: ['light', 'medium', 'heavy', null], default: null },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true },
);

symptomSchema.index({ userId: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('Symptom', symptomSchema);
