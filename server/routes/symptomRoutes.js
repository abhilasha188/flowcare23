const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/authMiddleware');
const { csrfProtection } = require('../middleware/csrfProtection');
const validateRequest = require('../middleware/validateRequest');
const writeRateLimiter = require('../middleware/writeRateLimiter');
const { create, get, list, remove, update } = require('../controllers/symptomController');

const router = express.Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const moods = ['happy', 'calm', 'sad', 'irritated', 'anxious', 'stressed', 'energetic', 'low', 'emotional'];
const flows = ['light', 'medium', 'heavy'];

const entryValidators = [
  body('date').isString().withMessage('Entry date is required.').bail().matches(datePattern).withMessage('Enter the date as YYYY-MM-DD.'),
  body('symptoms').optional().isArray({ max: 20 }).withMessage('Record no more than 20 symptoms per day.'),
  body('symptoms.*.name').if(body('symptoms').exists()).isString().trim().isLength({ min: 1, max: 60 }).withMessage('Symptom names must be 1 to 60 characters.'),
  body('symptoms.*.severity').if(body('symptoms').exists()).isInt({ min: 1, max: 10 }).withMessage('Severity must be a whole number from 1 to 10.'),
  body('symptoms.*.description').optional({ nullable: true }).isString().isLength({ max: 300 }).withMessage('Symptom descriptions must be 300 characters or fewer.'),
  body('mood').optional({ nullable: true, checkFalsy: true }).isIn(moods).withMessage('Select a valid mood.'),
  body('energyLevel').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 10 }).withMessage('Energy level must be from 1 to 10.'),
  body('sleepQuality').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 10 }).withMessage('Sleep quality must be from 1 to 10.'),
  body('flowIntensity').optional({ nullable: true, checkFalsy: true }).isIn(flows).withMessage('Select a valid flow intensity.'),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Notes must be 2,000 characters or fewer.'),
];

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(asyncHandler(authenticate));
router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(get));
router.post('/', writeRateLimiter, csrfProtection, entryValidators, validateRequest, asyncHandler(create));
router.put('/:id', writeRateLimiter, csrfProtection, entryValidators, validateRequest, asyncHandler(update));
router.delete('/:id', writeRateLimiter, csrfProtection, asyncHandler(remove));

module.exports = router;
