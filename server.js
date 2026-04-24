require('dotenv').config(); // Load env vars first
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const config = require('./config');
const specs = require('./config/swagger');
const routes = require('./routes');
const docsRoute = require('./routes/docs');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimit');

const app = express();
const PORT = config.port;

// Security middleware (order matters - run first)
app.use(helmet()); // Sets secure HTTP headers
app.use(cors(config.cors)); // Enable CORS with configured options

// Rate limiting (~before expensive operations)
app.use(rateLimiter);

// Logging (after security, before business logic)
// 'dev' format is concise, colored output for development
// 'combined' is Apache-style logs for production
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Body parsing (after security, before routes)
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies, limit size
app.use(express.urlencoded({ extended: true })); // Parse form data

// Static files (documentation HTML, assets)
app.use(express.static('public'));

// Swagger UI at /swagger (interactive API docs)
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OpenMetadata AI Gateway API'
}));

// Custom branded docs at /api-docs
app.use('/api-docs', docsRoute);

// Redirect root to docs
app.get('/', (req, res) => res.redirect('/api-docs'));

// API routes (all business logic)
app.use('/api/v1', routes);

// 404 handler (catch-all for unmatched routes)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`OpenMetadata AI Gateway running on port ${PORT}`);
  console.log(`API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`Swagger UI: http://localhost:${PORT}/swagger`);
  console.log(`OpenMetadata: ${config.openMetadata.baseUrl}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed. Process terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app; // Export for testing