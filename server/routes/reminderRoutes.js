const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/authMiddleware');
const { csrfProtection } = require('../middleware/csrfProtection');
const validateRequest = require('../middleware/validateRequest');
const writeRateLimiter = require('../middleware/writeRateLimiter');
const { create, list, remove, update } = require('../controllers/reminderController');
const types = require('../utils/reminderTypes');

const router = express.Router();
const dateTimeWithZone = /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i;
const allowedFields = ['type', 'title', 'message', 'scheduledAt', 'enabled', 'status'];

const reminderValidators = [
  body('type').optional().isIn(types).withMessage('Select a valid reminder type.'),
  body('title').optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage('Reminder titles must be 2 to 80 characters.'),
  body('message').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Reminder messages must be 500 characters or fewer.'),
  body('scheduledAt').optional().isString().matches(dateTimeWithZone).withMessage('Choose a date and time with a timezone.'),
  body('enabled').optional().isBoolean().withMessage('Reminder enabled state must be true or false.').bail().toBoolean(),
  body('status').optional().isIn(['scheduled', 'dismissed']).withMessage('Select a valid reminder status.'),
];

function requireAtLeastOneField(req, res, next) {
  if (!Object.keys(req.body || {}).some((key) => allowedFields.includes(key))) {
    return res.status(400).json({ success: false, message: 'Provide at least one reminder field to update.', errors: [] });
  }
  return next();
}

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(asyncHandler(authenticate));
router.get('/', asyncHandler(list));
router.post('/', writeRateLimiter, csrfProtection, reminderValidators, validateRequest, asyncHandler(create));
router.put('/:id', writeRateLimiter, csrfProtection, reminderValidators, validateRequest, asyncHandler(update));
router.patch('/:id', writeRateLimiter, csrfProtection, requireAtLeastOneField, reminderValidators, validateRequest, asyncHandler(update));
router.delete('/:id', writeRateLimiter, csrfProtection, asyncHandler(remove));

module.exports = router;
