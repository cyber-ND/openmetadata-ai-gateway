const express = require('express');
const router = express.Router();
const impactController = require('../controllers/impactController');
const { validateImpact } = require('../middleware/validate');

router.post('/', validateImpact, impactController.analyzeImpact);

module.exports = router;