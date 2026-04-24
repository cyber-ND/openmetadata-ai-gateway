// Pattern: Pure functions, no side effects, reusable across app
//  Parse Fully Qualified Name (FQN) into components
//  Example: "snowflake.prod.customers" -> { service: "snowflake", database: "prod", entity: "customers" }
const parseFQN = (fqn) => {
  if (!fqn || typeof fqn !== 'string') {
    return null;
  }
  
  const parts = fqn.split('.');
  
  // Common patterns: service.table, service.schema.table, service.schema.table.column
  if (parts.length < 2) {
    return null;
  }
  
  return {
    service: parts[0],
    database: parts[1] || null,
    entity: parts[2] || parts[1], // Fallback if no schema
    column: parts[3] || null,
    full: fqn,
    depth: parts.length
  };
};

// Build FQN from components
const buildFQN = (service, database, entity, column) => {
  const parts = [service, database, entity].filter(Boolean);
  if (column) parts.push(column);
  return parts.join('.');
};

//  Sanitize SQL-like strings to prevent injection in our contexts
//  Note: This is NOT a substitute for parameterized queries in real SQL
const sanitizeSQLString = (str) => {
  if (!str) return '';
  // Remove potentially dangerous characters for our use case
  return str
    .replace(/[;'"\\]/g, '') // Remove quotes, semicolons, backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment starts
    .trim();
};

//  Format bytes to human readable
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

//  Truncate string with ellipsis
const truncate = (str, maxLength = 100) => {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
};

//  Calculate risk score from lineage impact (1-10 scale)
const calculateRiskScore = (upstreamCount, downstreamCount, criticality = 'medium') => {
  const baseScore = Math.min(upstreamCount + downstreamCount, 8);
  const multiplier = { low: 0.8, medium: 1, high: 1.2, critical: 1.5 };
  const score = Math.ceil(baseScore * (multiplier[criticality] || 1));
  return Math.min(score, 10); // Cap at 10
};

// Format timestamp consistently
const formatTimestamp = (date = new Date()) => {
  return date.toISOString();
};

// Deep pick properties from object (safer than lodash for our needs)
const pick = (obj, keys) => {
  const result = {};
  keys.forEach(key => {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  });
  return result;
};

module.exports = {
  parseFQN,
  buildFQN,
  sanitizeSQLString,
  formatBytes,
  truncate,
  calculateRiskScore,
  formatTimestamp,
  pick
};