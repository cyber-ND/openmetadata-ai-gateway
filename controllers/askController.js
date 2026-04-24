const openmetadata = require('../services/openmetadata');
const formatter = require('../services/formatter');

exports.ask = async (req, res, next) => {
  try {
    const { query } = req.body;
    const userId = req.user?.id;
    const token = req.token;

    const omResponse = await openmetadata.askAI(query, userId, token);
    const response = formatter.formatAskResponse(omResponse, query);
    
    res.json(response);
  } catch (error) {
    next(error);
  }
};