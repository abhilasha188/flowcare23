const express = require('express');
const { get, list } = require('../controllers/resourceController');

const router = express.Router();
router.get('/', list);
router.get('/:slug', get);

module.exports = router;
