// SQL generation controller
// Uses catalog metadata to build context-aware queries

const openmetadata = require('../services/openmetadata');
const formatter = require('../services/formatter');
const { parseFQN } = require('../utils/helpers');


exports.generateSQL = async (req, res, next) => {
  try {
    const { question, tables } = req.body;
    const token = req.token;

    let contextTables = [];
    
    if (tables && tables.length > 0) {
      contextTables = await Promise.all(
        tables.map(fqn => openmetadata.getTableSchema(fqn, token).catch(() => null))
      );
      contextTables = contextTables.filter(Boolean);
    } else {
      // Search for relevant tables using simple keywords from question
      const keywords = question.replace(/generate|sql|show|me|by|total/gi, '').trim();
      const searchResults = await openmetadata.searchEntities(keywords, {
        entityType: 'table'
      }, token);
      
      const topTables = (searchResults.hits?.hits || []).slice(0, 3);
      contextTables = await Promise.all(
        topTables.map(hit => 
          openmetadata.getTableSchema(hit._source?.fullyQualifiedName, token).catch(() => null)
        )
      );
      contextTables = contextTables.filter(Boolean);
    }

    // Generate SQL locally using schema context (no OM AI needed)
    const sql = generateSQLFromSchema(question, contextTables);
    const explanation = `Generated SQL using ${contextTables.length} table(s)`;

    res.json(formatter.formatSQLResponse(
      { sql, explanation },
      contextTables
    ));
  } catch (error) {
    next(error);
  }
};

// Simple SQL generator based on schema context
function generateSQLFromSchema(question, tables) {
  const lowerQ = question.toLowerCase();
  
  // Extract table names
  const tableNames = tables.map(t => {
    const parts = t.fullyQualifiedName.split('.');
    return parts[parts.length - 1];
  });
  
  const mainTable = tableNames[0];
  const columns = tables[0].columns || [];
  
  // Simple pattern matching
  let selectCols = '*';
  const aggMatch = lowerQ.match(/(total|sum|count|avg|max|min)\s+(?:of\s+)?(\w+)/);
  if (aggMatch) {
    const agg = aggMatch[1] === 'total' ? 'SUM' : aggMatch[1].toUpperCase();
    const col = aggMatch[2];
    selectCols = `${agg}(${col}) as ${agg.toLowerCase()}_${col}`;
  }
  
  // Group by detection
  let groupBy = '';
  const groupMatch = lowerQ.match(/by\s+(\w+)/);
  if (groupMatch) {
    const groupCol = groupMatch[1];
    // Check if column exists in schema
    const hasCol = columns.some(c => c.name.toLowerCase().includes(groupCol.toLowerCase()));
    if (hasCol) {
      selectCols = `${groupCol}, ${selectCols}`;
      groupBy = `GROUP BY ${groupCol}`;
    }
  }
  
  // Time period detection
  let timeFilter = '';
  if (lowerQ.includes('monthly')) {
    timeFilter = `DATE_TRUNC('month', date_column)`;
  }
  
  let sql = `SELECT ${selectCols}\nFROM ${mainTable}`;
  
  if (tableNames.length > 1) {
    sql += `\nJOIN ${tableNames[1]} ON ${mainTable}.id = ${tableNames[1]}.${mainTable}_id`;
  }
  
  if (groupBy) {
    sql += `\n${groupBy}`;
  }
  
  sql += `\nLIMIT 100;`;
  
  return sql;
}

exports._extractSQL = (text) => {
  // Try to extract SQL from markdown code blocks
  const codeBlockMatch = text.match(/```sql\n([\s\S]*?)\n```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  
  const genericBlockMatch = text.match(/```\n?([\s\S]*?)\n?```/);
  if (genericBlockMatch) return genericBlockMatch[1].trim();
  
  // Assume entire response is SQL if no code blocks
  return text.trim();
};