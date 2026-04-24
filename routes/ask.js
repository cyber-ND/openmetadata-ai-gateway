const express = require('express');
const router = express.Router();
const askController = require('../controllers/askController');
const { validateAsk } = require('../middleware/validate');

router.post('/', validateAsk, askController.ask);

module.exports = router;