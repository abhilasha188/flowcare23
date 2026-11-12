const Cycle = require('../models/Cycle');
const Reminder = require('../models/Reminder');
const Symptom = require('../models/Symptom');
const User = require('../models/User');
const { clearAuthCookie } = require('../utils/auth');
const { serializeUser } = require('./authController');

const PROFILE_FIELDS = [
  'fullName',
  'email',
  'dateOfBirth',
  'averageCycleLength',
  'averagePeriodDuration',
  'notificationPreferences',
  'predictionPreferences',
];

function respondError(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message, errors: [] });
}

async function getProfile(req, res) {
  return res.status(200).json({ success: true, user: serializeUser(req.user) });
}

async function updateProfile(req, res, next) {
  try {
    if (!PROFILE_FIELDS.some((field) => Object.hasOwn(req.body, field))) {
      return respondError(res, 'Provide at least one profile field to update.');
    }

    const user = req.user;
    if (Object.hasOwn(req.body, 'email')) {
      const email = req.body.email.trim().toLowerCase();
      if (email !== user.email) {
        if (typeof req.body.currentPassword !== 'string') {
          return respondError(res, 'Enter your current password to change your email.');
        }
        const account = await User.findById(user._id).select('+password');
        if (!await account.comparePassword(req.body.currentPassword)) {
          return respondError(res, 'Current password is incorrect.', 401);
        }
        user.email = email;
      }
    }
    if (Object.hasOwn(req.body, 'fullName')) user.fullName = req.body.fullName.trim();
    if (Object.hasOwn(req.body, 'dateOfBirth')) {
      user.dateOfBirth = req.body.dateOfBirth
        ? new Date(`${req.body.dateOfBirth}T00:00:00.000Z`)
        : undefined;
    }
    for (const field of ['averageCycleLength', 'averagePeriodDuration']) {
      if (Object.hasOwn(req.body, field)) {
        const value = req.body[field];
        user[field] = value === '' || value === null ? undefined : Number(value);
      }
    }
    if (Object.hasOwn(req.body, 'notificationPreferences')) {
      user.notificationPreferences = {
        ...user.notificationPreferences.toObject(),
        ...req.body.notificationPreferences,
      };
    }
    if (Object.hasOwn(req.body, 'predictionPreferences')) {
      user.predictionPreferences = {
        ...user.predictionPreferences.toObject(),
        ...req.body.predictionPreferences,
      };
    }
    await user.save();
    return res.status(200).json({ success: true, message: 'Profile updated.', user: serializeUser(user) });
  } catch (error) {
    if (error?.code === 11000) return respondError(res, 'An account with this email already exists.', 409);
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !await user.comparePassword(req.body.currentPassword)) {
      return respondError(res, 'Current password is incorrect.', 401);
    }
    if (req.body.newPassword !== req.body.confirmNewPassword) {
      return respondError(res, 'New password and confirmation do not match.');
    }

    user.password = req.body.newPassword;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    clearAuthCookie(res);
    return res.status(200).json({
      success: true,
      message: 'Password changed. Sign in again with your new password.',
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteHealthData(req, res, next) {
  try {
    const userId = req.user._id;
    const [cycles, symptoms, reminders] = await Promise.all([
      Cycle.deleteMany({ userId }),
      Symptom.deleteMany({ userId }),
      Reminder.deleteMany({ userId }),
    ]);
    req.user.averageCycleLength = undefined;
    req.user.averagePeriodDuration = undefined;
    await req.user.save();
    return res.status(200).json({
      success: true,
      message: 'Your health tracking data was deleted.',
      deleted: {
        cycles: cycles.deletedCount,
        symptoms: symptoms.deletedCount,
        reminders: reminders.deletedCount,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !await user.comparePassword(req.body.password)) {
      return respondError(res, 'Password is incorrect.', 401);
    }
    if (req.body.confirmation !== 'DELETE') {
      return respondError(res, 'Type DELETE to confirm account removal.');
    }

    const userId = user._id;
    await Promise.all([
      Cycle.deleteMany({ userId }),
      Symptom.deleteMany({ userId }),
      Reminder.deleteMany({ userId }),
    ]);
    await user.deleteOne();
    clearAuthCookie(res);
    return res.status(200).json({ success: true, message: 'Your account and associated records were deleted.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  changePassword,
  deleteAccount,
  deleteHealthData,
  getProfile,
  updateProfile,
};
