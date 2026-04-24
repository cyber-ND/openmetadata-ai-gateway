// Centralized error handling middleware
// Pattern: Catch all errors, log them, return safe response to client

const config = require('../config');

// Global error handler - must have 4 params for Express to recognize it as error handler
const errorHandler = (err, req, res, next) => {
  // Log error details (but not in test environment)
  if (config.nodeEnv !== 'test') {
    console.error(`[ERROR] ${err.code || 'UNKNOWN'}: ${err.message}`);
    console.error(`Path: ${req.originalUrl}, Method: ${req.method}`);
    if (err.stack && config.nodeEnv === 'development') {
      console.error(err.stack);
    }
  }

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Build response
  const response = {
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  // Include details only in development
  if (config.nodeEnv === 'development') {
    response.details = {
      stack: err.stack,
      // Include original error if from external service
      source: err.source,
      originalError: err.originalError
    };
  }

  res.status(statusCode).json(response);
};

// Handle unhandled promise rejections (outside Express)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application continues running, but log for investigation
});

// Handle uncaught exceptions (critical - should restart process)
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Graceful shutdown
  process.exit(1);
});

module.exports = errorHandler;