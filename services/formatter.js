// Response formatting and normalization
// Pattern: Consistent envelope format across all endpoints

const { formatTimestamp } = require("../utils/helpers");

class Formatter {
  // Standard success response envelope
  success(data, meta = {}) {
    return {
      success: true,
      timestamp: formatTimestamp(),
      data,
      meta: {
        ...meta,
        requestId: meta.requestId || this._generateRequestId(),
      },
    };
  }

  // Paginated response wrapper
  paginated(data, pagination) {
    return {
      success: true,
      timestamp: formatTimestamp(),
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        hasMore: pagination.page * pagination.limit < pagination.total,
      },
    };
  }

  // AI query response formatter
  formatAskResponse(omResponse, userQuery) {
    // Normalize various OM AI response formats
    const answer =
      omResponse.answer ||
      omResponse.response ||
      omResponse.text ||
      "No answer provided";
    const sources =
      omResponse.sources || omResponse.references || omResponse.entities || [];

    return this.success({
      query: userQuery,
      answer,
      sources: sources.map((s) => ({
        name: s.name || s.displayName,
        fqn: s.fullyQualifiedName || s.fqn,
        type: s.entityType || s.type || "unknown",
        description: s.description,
        url: this._buildOMUrl(s.fullyQualifiedName, s.entityType),
      })),
      confidence: omResponse.confidence || "medium",
    });
  }

  // Impact analysis response formatter
  formatImpactResponse(impactAnalysis) {
    return this.success(impactAnalysis);
  }

  // SQL generation response formatter
  formatSQLResponse(sqlData, tablesUsed) {
    return this.success({
      sql: sqlData.sql || sqlData.query,
      explanation: sqlData.explanation || sqlData.description,
      tablesUsed: tablesUsed.map((t) => ({
        name: t.name,
        fqn: t.fullyQualifiedName,
        columns: t.columns?.map((c) => c.name) || [],
      })),
      warnings: sqlData.warnings || [],
      estimatedComplexity: this._estimateComplexity(sqlData.sql),
    });
  }

  // Alert formatting for external webhooks
  formatAlertPayload(testCase, channels) {
    const testName = testCase.name || testCase.displayName;
    const entityFQN = testCase.entityLink?.fullyQualifiedName || "unknown";
    const result = testCase.testCaseResult || {};

    const basePayload = {
      timestamp: formatTimestamp(),
      event: "data_quality_alert",
      severity: result.testResultStatus === "Failed" ? "high" : "medium",
      testCase: {
        id: testCase.id,
        name: testName,
        entity: entityFQN,
        status: result.testResultStatus,
        executedAt: result.timestamp,
        result: result.result,
        sampleData: result.sampleData,
      },
      message: this._buildAlertMessage(testName, entityFQN, result),
      links: {
        openMetadata: this._buildOMUrl(entityFQN, "table"),
        testCase: `${process.env.OPENMETADATA_BASE_URL}/test-case/${testCase.id}`,
      },
    };

    // Format per channel requirements
    return channels.map((channel) => ({
      channel,
      payload: this._adaptForChannel(basePayload, channel),
      formatted: this._formatForChannel(basePayload, channel),
    }));
  }

  _buildOMUrl(fqn, type) {
    if (!fqn) return null;
    const base = process.env.OPENMETADATA_BASE_URL;
    return `${base}/${type}/${encodeURIComponent(fqn)}`;
  }

  _buildAlertMessage(testName, entity, result) {
    const status = result.testResultStatus || "unknown";
    return `Data quality test "${testName}" ${status.toLowerCase()} for ${entity}`;
  }

  _adaptForChannel(payload, channel) {
    // Channel-specific payload transformations
    switch (channel) {
      case "slack":
        return {
          text: payload.message,
          attachments: [
            {
              color: payload.severity === "high" ? "danger" : "warning",
              fields: [
                { title: "Test", value: payload.testCase.name, short: true },
                {
                  title: "Status",
                  value: payload.testCase.status,
                  short: true,
                },
                {
                  title: "Entity",
                  value: payload.testCase.entity,
                  short: false,
                },
              ],
            },
          ],
        };
      case "email":
        return {
          subject: `[${payload.severity.toUpperCase()}] Data Quality Alert: ${payload.testCase.name}`,
          body: payload.message,
          html: this._buildEmailHtml(payload),
        };
      default:
        return payload;
    }
  }

  _formatForChannel(payload, channel) {
    // Human-readable formatted strings for display/logging
    if (channel === "slack") {
      return `🚨 *${payload.severity.toUpperCase()}* | Test *${payload.testCase.name}* ${payload.testCase.status} on \`${payload.testCase.entity}\``;
    }
    if (channel === "email") {
      return payload.message;
    }
    return JSON.stringify(payload, null, 2);
  }

  _buildEmailHtml(payload) {
    return `
      <h2>Data Quality Alert</h2>
      <p><strong>Test:</strong> ${payload.testCase.name}</p>
      <p><strong>Status:</strong> ${payload.testCase.status}</p>
      <p><strong>Entity:</strong> ${payload.testCase.entity}</p>
      <p><strong>Time:</strong> ${payload.timestamp}</p>
      <a href="${payload.links.openMetadata}">View in OpenMetadata</a>
    `;
  }

  _estimateComplexity(sql) {
    if (!sql) return "unknown";
    const lower = sql.toLowerCase();
    let score = 0;
    if (lower.includes("join")) score += 1;
    if (lower.includes("subquery") || lower.includes("select.*from.*select"))
      score += 2;
    if (lower.includes("window") || lower.includes("over(")) score += 2;
    if (lower.includes("cte") || lower.includes("with ")) score += 1;
    if (lower.includes("union")) score += 1;

    if (score <= 1) return "simple";
    if (score <= 3) return "moderate";
    return "complex";
  }

  _generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new Formatter();
