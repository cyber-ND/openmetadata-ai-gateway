// Custom documentation page controller

const path = require('path');

exports.getDocs = (req, res) => {
  res.sendFile(path.join(__dirname, '../public/api-docs.html'));
};

exports.getHealth = (req, res) => {
  res.json({
    status: 'healthy',
    service: 'openmetadata-ai-gateway',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
};