const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/authMiddleware');
const { csrfProtection } = require('../middleware/csrfProtection');
const validateRequest = require('../middleware/validateRequest');
const writeRateLimiter = require('../middleware/writeRateLimiter');
const {
  create,
  getCycle,
  getCycles,
  remove,
  update,
} = require('../controllers/cycleController');

const router = express.Router();
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const periodValidators = [
  body('startDate')
    .isString().withMessage('Period start date is required.')
    .bail()
    .matches(dateOnlyPattern).withMessage('Enter the start date as YYYY-MM-DD.'),
  body('endDate')
    .optional({ nullable: true, checkFalsy: true })
    .isString().withMessage('Enter a valid period end date.')
    .bail()
    .matches(dateOnlyPattern).withMessage('Enter the end date as YYYY-MM-DD.'),
  body('flowIntensity')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['light', 'medium', 'heavy']).withMessage('Select light, medium, or heavy flow.'),
  body('notes')
    .optional({ nullable: true })
    .isString().withMessage('Notes must be text.')
    .bail()
    .isLength({ max: 500 }).withMessage('Notes must be 500 characters or fewer.'),
];

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(asyncHandler(authenticate));
router.get('/', getCycles);
router.get('/:id', getCycle);
router.post('/', writeRateLimiter, csrfProtection, periodValidators, validateRequest, asyncHandler(create));
router.put('/:id', writeRateLimiter, csrfProtection, periodValidators, validateRequest, asyncHandler(update));
router.delete('/:id', writeRateLimiter, csrfProtection, asyncHandler(remove));

module.exports = router;
