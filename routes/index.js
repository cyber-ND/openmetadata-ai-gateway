// Main API router - aggregates all route modules

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');

const askRoutes = require('./ask');
const impactRoutes = require('./impact');
const alertsRoutes = require('./alerts');
const sqlRoutes = require('./sql');

// All routes require authentication
router.use('/ask', authenticate, askRoutes);
router.use('/impact', authenticate, impactRoutes);
router.use('/alerts', authenticate, alertsRoutes);
router.use('/sql', authenticate, sqlRoutes);

module.exports = router;