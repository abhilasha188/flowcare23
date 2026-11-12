const express = require('express');
const { rateLimit } = require('express-rate-limit');
const authenticate = require('../middleware/authMiddleware');
const { csrfProtection, issueCsrfToken } = require('../middleware/csrfProtection');
const validateRequest = require('../middleware/validateRequest');
const {
  getCurrentUser,
  login,
  logout,
  register,
  updateCyclePreferences,
} = require('../controllers/authController');
const {
  cyclePreferenceValidators,
  loginValidators,
  registerValidators,
} = require('../utils/validation');

const router = express.Router();

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    errors: [],
  }),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    success: false,
    message: 'Too many sign-in attempts. Please try again later.',
    errors: [],
  }),
});

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.get('/csrf', issueCsrfToken);
router.post('/register', registrationLimiter, csrfProtection, registerValidators, validateRequest, asyncHandler(register));
router.post('/login', loginLimiter, csrfProtection, loginValidators, validateRequest, asyncHandler(login));
router.post('/logout', csrfProtection, asyncHandler(logout));
router.get('/me', asyncHandler(authenticate), getCurrentUser);
router.patch(
  '/preferences',
  asyncHandler(authenticate),
  csrfProtection,
  cyclePreferenceValidators,
  validateRequest,
  asyncHandler(updateCyclePreferences),
);

module.exports = router;
