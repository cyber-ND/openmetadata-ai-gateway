// Rate limiting using memory store (sufficient for hackathon/single-instance)
// For production scale, switch to Redis store

const rateLimit = require('express-rate-limit');
const config = require('../config');

//  Memory-based rate limiter
//  Tracks requests per IP address
//  Resets after windowMs (default 15 minutes)
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  
  // Custom error response
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000) // seconds
  },
  
  // Standard headers: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
  standardHeaders: true,
  
  // Disable legacy X-RateLimit-* headers (deprecated)
  legacyHeaders: false,
  
  // Skip rate limiting for health checks (optional)
  skip: (req) => req.path === '/health',
  
  // Handler for when limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      limit: config.rateLimit.max,
      window: `${config.rateLimit.windowMs / 60000} minutes`,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
  }
});

module.exports = limiter;