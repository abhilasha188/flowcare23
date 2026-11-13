const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^[\s\S]{6,12}$/;
const notificationPreferencesSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    periodReminders: { type: Boolean, default: false },
    symptomReminders: { type: Boolean, default: false },
    browserNotifications: { type: Boolean, default: false },
    reminderTime: { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm format.'], default: '09:00' },
  },
  { _id: false },
);
const predictionPreferencesSchema = new mongoose.Schema(
  {
    showPhaseEstimate: { type: Boolean, default: true },
    showFertileWindow: { type: Boolean, default: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
      validate: {
        validator: (value) => namePattern.test(value),
        message: 'Enter a valid full name.',
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [emailPattern, 'Enter a valid email address.'],
    },
    password: {
      type: String,
      required: true,
      select: false,
      maxlength: 64,
      validate: {
        validator: (value) => passwordPattern.test(value),
        message: 'Password does not meet the security requirements.',
      },
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: (value) => {
          if (!value) return true;
          const today = new Date();
          const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
          const earliest = new Date(Date.UTC(today.getUTCFullYear() - 120, today.getUTCMonth(), today.getUTCDate()));
          return value <= todayUtc && value >= earliest;
        },
        message: 'Date of birth must be within a reasonable range and not in the future.',
      },
    },
    averageCycleLength: {
      type: Number,
      min: 15,
      max: 60,
      validate: {
        validator: (value) => value == null || Number.isInteger(value),
        message: 'Average cycle length must be a whole number.',
      },
    },
    averagePeriodDuration: {
      type: Number,
      min: 1,
      max: 15,
      validate: {
        validator: (value) => value == null || Number.isInteger(value),
        message: 'Average period duration must be a whole number.',
      },
    },
    termsAcceptedAt: {
      type: Date,
      required: true,
    },
    sessionVersion: {
      type: Number,
      min: 0,
      default: 0,
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    predictionPreferences: {
      type: predictionPreferencesSchema,
      default: () => ({}),
    },
    aiPersonalizationConsent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', {
  transform(_document, returned) {
    delete returned.password;
    delete returned.__v;
    delete returned.termsAcceptedAt;
    return returned;
  },
});

module.exports = mongoose.model('User', userSchema);
