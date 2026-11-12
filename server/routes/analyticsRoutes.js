const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const {
  cycles,
  moods,
  overview,
  patterns,
  symptoms,
} = require('../controllers/analyticsController');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(asyncHandler(authenticate));
router.get('/overview', asyncHandler(overview));
router.get('/cycles', asyncHandler(cycles));
router.get('/symptoms', asyncHandler(symptoms));
router.get('/moods', asyncHandler(moods));
router.get('/patterns', asyncHandler(patterns));

module.exports = router;
