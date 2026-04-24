// Input validation middleware using express-validator
// Pattern: Validate early, sanitize inputs, fail fast

const { body, param, query, validationResult } = require('express-validator');

//   Middleware to check validation results
//   Attached to routes after validation rules
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors for consistent API response
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      details: formattedErrors
    });
  }
  
  next();
};

//  Validation rules for /ask endpoint
const validateAsk = [
  body('query')
    .trim()
    .notEmpty().withMessage('Query is required')
    .isLength({ max: 500 }).withMessage('Query must be under 500 characters')
    .escape(), // Sanitize HTML tags
  
  handleValidationErrors
];

// middleware/validate.js — replace validateImpact

const validateImpact = [
  body('table')
    .trim()
    .notEmpty().withMessage('Table FQN is required')
    .matches(/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+){2,}$/)
    .withMessage('Invalid FQN format. Expected: service.schema.table or deeper'),
  
  body('change')
    .trim()
    .notEmpty().withMessage('Change description is required')
    .isLength({ max: 200 }).withMessage('Change description too long (max 200 chars)')
    .escape(),
  
  handleValidationErrors
];

//  * Validation for SQL generation
const validateSQL = [
  body('question')
    .trim()
    .notEmpty().withMessage('Question is required')
    .isLength({ max: 500 }).withMessage('Question too long')
    .escape(),
  
  body('tables')
    .optional()
    .isArray({ max: 10 }).withMessage('Max 10 tables allowed'),
  
  handleValidationErrors
];

// Validation for alerts

const validateAlerts = [
  body('testCaseId')
    .trim()
    .notEmpty().withMessage('Test case ID is required')
    .isUUID().withMessage('Invalid test case ID format'),
  
  body('channels')
    .isArray({ min: 1, max: 5 }).withMessage('At least 1 channel, max 5')
    .custom((channels) => {
      const valid = ['slack', 'email', 'webhook', 'pagerduty', 'teams'];
      const invalid = channels.filter(c => !valid.includes(c));
      if (invalid.length > 0) {
        throw new Error(`Invalid channels: ${invalid.join(', ')}. Valid: ${valid.join(', ')}`);
      }
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  validateAsk,
  validateImpact,
  validateSQL,
  validateAlerts,
  handleValidationErrors
};