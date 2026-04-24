const openmetadata = require('../services/openmetadata');
const formatter = require('../services/formatter');

exports.sendAlert = async (req, res, next) => {
  try {
    const { testCaseId, channels, webhookUrl } = req.body;
    const token = req.token;

    // Use the correct endpoint for test cases
    const testCase = await openmetadata.getTestCaseById(testCaseId, token);
    
    const formattedAlerts = formatter.formatAlertPayload(testCase, channels);
    
    const results = formattedAlerts.map(alert => ({
      channel: alert.channel,
      sent: true,
      preview: alert.formatted,
      payload: alert.payload
    }));

    res.json(formatter.success({
      testCaseId,
      alertSent: true,
      channels: results,
      summary: `Alert formatted for ${channels.length} channel(s)`
    }));
  } catch (error) {
    next(error);
  }
};