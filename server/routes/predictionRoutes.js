const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { getPredictions } = require('../controllers/analyticsController');

const router = express.Router();
router.get('/', authenticate, getPredictions);

module.exports = router;
