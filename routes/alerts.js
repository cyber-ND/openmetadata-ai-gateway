const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alertsController');
const { validateAlerts } = require('../middleware/validate');

router.post('/', validateAlerts, alertsController.sendAlert);

module.exports = router;