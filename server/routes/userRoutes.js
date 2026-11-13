const express = require('express');
const { body } = require('express-validator');
const { rateLimit } = require('express-rate-limit');
const authenticate = require('../middleware/authMiddleware');
const { csrfProtection } = require('../middleware/csrfProtection');
const validateRequest = require('../middleware/validateRequest');
const {
  changePassword,
  deleteAccount,
  deleteHealthData,
  getProfile,
  updateProfile,
} = require('../controllers/userController');
const {
  isValidDateOfBirth,
  isValidEmail,
  isValidFullName,
  isValidOptionalInteger,
  isValidPassword,
} = require('../utils/validation');

const router = express.Router();
const accountActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    success: false,
    message: 'Too many account security attempts. Please wait and try again.',
    errors: [],
  }),
});
const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const profileValidators = [
  body('fullName').optional().isString().bail().custom(isValidFullName).withMessage('Enter a valid full name.'),
  body('email').optional().isString().bail().trim().toLowerCase().custom(isValidEmail).withMessage('Enter a valid email address.'),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isString().bail().custom(isValidDateOfBirth).withMessage('Enter a valid date of birth.'),
  body('averageCycleLength').optional({ nullable: true }).custom((value) => value === '' || isValidOptionalInteger(value, 15, 60)).withMessage('Average cycle length must be a whole number from 15 to 60.'),
  body('averagePeriodDuration').optional({ nullable: true }).custom((value) => value === '' || isValidOptionalInteger(value, 1, 15)).withMessage('Average period duration must be a whole number from 1 to 15.'),
  body('currentPassword').optional().isString().isLength({ min: 1, max: 64 }).withMessage('Enter your current password.'),
  body('notificationPreferences').optional().isObject().withMessage('Notification preferences must be an object.'),
  body('predictionPreferences').optional().isObject().withMessage('Prediction preferences must be an object.'),
  body('notificationPreferences.enabled').optional().isBoolean().withMessage('Notifications must be enabled or disabled.').bail().toBoolean(),
  body('notificationPreferences.periodReminders').optional().isBoolean().withMessage('Period reminders must be enabled or disabled.').bail().toBoolean(),
  body('notificationPreferences.symptomReminders').optional().isBoolean().withMessage('Symptom reminders must be enabled or disabled.').bail().toBoolean(),
  body('notificationPreferences.browserNotifications').optional().isBoolean().withMessage('Browser notifications must be enabled or disabled.').bail().toBoolean(),
  body('notificationPreferences.reminderTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Reminder time must use 24-hour HH:mm format.'),
  body('predictionPreferences.showPhaseEstimate').optional().isBoolean().withMessage('Phase estimates must be enabled or disabled.').bail().toBoolean(),
  body('predictionPreferences.showFertileWindow').optional().isBoolean().withMessage('Fertile window estimates must be enabled or disabled.').bail().toBoolean(),
];

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(asyncHandler(authenticate));
router.get('/me', getProfile);
router.patch('/me', profileUpdateLimiter, csrfProtection, profileValidators, validateRequest, asyncHandler(updateProfile));
router.post(
  '/change-password',
  accountActionLimiter,
  csrfProtection,
  [
    body('currentPassword').isString().isLength({ min: 1, max: 64 }).withMessage('Enter your current password.'),
    body('newPassword').isString().bail().custom(isValidPassword).withMessage('Use 6 to 12 characters.'),
    body('confirmNewPassword').isString().isLength({ min: 1, max: 64 }).withMessage('Confirm your new password.'),
  ],
  validateRequest,
  asyncHandler(changePassword),
);
router.delete('/health-data', accountActionLimiter, csrfProtection, asyncHandler(deleteHealthData));
router.delete(
  '/account',
  accountActionLimiter,
  csrfProtection,
  [
    body('password').isString().isLength({ min: 1, max: 64 }).withMessage('Enter your password to delete the account.'),
    body('confirmation').equals('DELETE').withMessage('Type DELETE to confirm account removal.'),
  ],
  validateRequest,
  asyncHandler(deleteAccount),
);

module.exports = router;
