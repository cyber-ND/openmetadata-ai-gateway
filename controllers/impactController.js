// Impact analysis controller
// Analyzes downstream effects of schema changes

const lineage = require('../services/lineage');
const formatter = require('../services/formatter');

exports.analyzeImpact = async (req, res, next) => {
  try {
    const { table, change } = req.body;
    const token = req.token; // ADD THIS

    const analysis = await lineage.analyzeImpact(table, change, token); // PASS TOKEN
    
    res.json(formatter.formatImpactResponse(analysis));
  } catch (error) {
    next(error);
  }
};