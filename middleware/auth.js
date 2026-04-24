// JWT validation middleware
// Pattern: Delegate auth to OpenMetadata 

const openmetadata = require('../services/openmetadata');


// Extracts Bearer token from Authorization header
// Format: "Bearer <token>"
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer " prefix
};


//   Main auth middleware
//  Validates token with OpenMetadata and attaches user info to request
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Authorization header required (Bearer <token>)',
        code: 'AUTH_HEADER_MISSING',
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }

    // Validate with OpenMetadata
    const user = await openmetadata.validateToken(token);
    
    // Attach user info to request for downstream use
    // Controllers can access req.user.id, req.user.roles, etc.
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles || [],
      isAdmin: user.isAdmin || false
    };

    // Also store raw token in case we need to proxy it to OM
    req.token = token;

    next(); 
    
  } catch (error) {
    // Token invalid or OM unreachable
    res.status(401).json({
      error: 'Invalid or expired token',
      code: error.code || 'AUTH_INVALID',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


//  Optional auth - attaches user if token valid, but doesn't require it
//   Useful for public endpoints that work better with user context
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (token) {
      const user = await openmetadata.validateToken(token);
      req.user = user;
      req.token = token;
    }
    next();
  } catch {
    // Invalid token, but you can proceed without user
    next();
  }
};

module.exports = { authenticate, optionalAuth };