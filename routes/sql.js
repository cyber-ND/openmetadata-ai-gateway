const express = require('express');
const router = express.Router();
const sqlController = require('../controllers/sqlController');
const { validateSQL } = require('../middleware/validate');

router.post('/', validateSQL, sqlController.generateSQL);

module.exports = router;