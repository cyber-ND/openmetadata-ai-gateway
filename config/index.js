const { default: rateLimit } = require("express-rate-limit");

const config = {
    // server settings
    port: parseInt(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // openMetadata connection
    openMetadata: {
        baseUrl: process.env.OPENMETADATA_BASE_URL || 'http://localhost:8585',
        botToken: process.env.OPENMETADATA_BOT_TOKEN || '',
        timeout: parseInt(process.env.OM_TIMEOUT) || 30000 // 30 seconds default
    },

    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.'
    },

    // Security
    cors: {
        origin: process.env.CORS_ORIGIN || '*', // Allow all origins by default (will be restricted in production)
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
};

// validate critical configuration on startup
if (!config.openMetadata.baseUrl) {
    console.error('ERROR: OPENMETADATA_BASE_URL is required but not set.');
    process.exit(1);
}

module.exports = config;