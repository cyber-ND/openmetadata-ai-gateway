// Lineage analysis and impact calculation
// Pattern: Graph traversal algorithms for data dependency analysis

const openmetadata = require("./openmetadata");
const { calculateRiskScore, parseFQN } = require("../utils/helpers");

class LineageService {
  // Analyze impact of a proposed change on a table
  // Returns affected upstream and downstream assets with risk scoring
  async analyzeImpact(tableFQN, changeDescription, token) {
    const parsed = parseFQN(tableFQN);
    if (!parsed) {
      throw new Error('Invalid table FQN format');
    }

    // FIRST: Get table entity by FQN to obtain its UUID
    const tableEntity = await openmetadata.getEntityByFQN(tableFQN, 'tables', token);
    
    if (!tableEntity || !tableEntity.id) {
      throw new Error(`Table not found: ${tableFQN}`);
    }

    const entityId = tableEntity.id;

    // THEN: Call lineage with the UUID, not FQN
    const lineage = await openmetadata.getLineageById('table', entityId, 1, 3, token);

    // Transform lineage nodes into structured impact report
    const upstream = this._extractNodes(lineage.upstreamNodes || []);
    const downstream = this._extractNodes(lineage.downstreamNodes || []);

    // Calculate metrics
    const directDependents = downstream.filter((n) => n.level === 1).length;
    const totalDependents = downstream.length;
    const criticalAssets = downstream.filter(
      (n) =>
        n.type === "dashboard" ||
        n.type === "pipeline" ||
        n.tags?.includes("critical"),
    );

    // Determine change type from description keywords
    const changeType = this._classifyChange(changeDescription);

    // Risk increases with more downstream dependents and severity of change
    const riskScore = calculateRiskScore(
      upstream.length,
      downstream.length,
      this._determineCriticality(criticalAssets.length, changeType),
    );

    return {
      table: tableFQN,
      change: {
        description: changeDescription,
        type: changeType,
        severity: this._getSeverity(changeType),
      },
      summary: this._generateSummary(
        tableFQN,
        changeType,
        totalDependents,
        riskScore,
      ),
      riskScore,
      riskLevel: this._riskLevel(riskScore),
      affectedAssets: {
        upstream: upstream.slice(0, 10), // Limit detail for response size
        downstream: downstream.slice(0, 20),
        totalUpstream: upstream.length,
        totalDownstream: downstream.length,
        criticalCount: criticalAssets.length,
      },
      recommendations: this._generateRecommendations(
        changeType,
        criticalAssets,
        riskScore,
      ),
    };
  }

  // Extract and normalize nodes from lineage response
  _extractNodes(nodes) {
    return nodes.map((node) => ({
      id: node.id,
      name: node.name,
      fqn: node.fullyQualifiedName,
      type: node.entityType || node.type,
      level: node.level || 1,
      tags: node.tags || [],
      owner: node.owner?.name || "unassigned",
    }));
  }

  // Classify change type from natural language description
  _classifyChange(description) {
    const desc = description.toLowerCase();
    if (desc.includes("rename")) return "rename";
    if (desc.includes("delete") || desc.includes("drop")) return "deletion";
    if (desc.includes("type") || desc.includes("datatype"))
      return "type_change";
    if (desc.includes("add") || desc.includes("new")) return "addition";
    if (desc.includes("constraint") || desc.includes("null"))
      return "constraint_change";
    return "modification";
  }

  // Determine severity based on change type
  _getSeverity(changeType) {
    const severities = {
      deletion: "critical",
      rename: "high",
      type_change: "high",
      constraint_change: "medium",
      modification: "medium",
      addition: "low",
    };
    return severities[changeType] || "medium";
  }

  // Criticality factor for risk calculation
  _determineCriticality(criticalCount, changeType) {
    if (criticalCount > 3 || changeType === "deletion") return "critical";
    if (criticalCount > 0 || changeType === "rename") return "high";
    return "medium";
  }

  _riskLevel(score) {
    if (score >= 8) return "critical";
    if (score >= 6) return "high";
    if (score >= 4) return "medium";
    return "low";
  }

  _generateSummary(table, changeType, dependents, risk) {
    const riskText =
      risk >= 7 ? "high risk" : risk >= 4 ? "moderate risk" : "low risk";
    return `Changing ${table} (${changeType}) affects ${dependents} downstream assets with ${riskText}.`;
  }

  _generateRecommendations(changeType, criticalAssets, riskScore) {
    const recs = [];

    if (riskScore >= 7) {
      recs.push("Schedule change during maintenance window");
      recs.push("Notify all downstream asset owners");
    }

    if (changeType === "deletion") {
      recs.push("Create backup before deletion");
      recs.push("Verify no active pipelines depend on this table");
    }

    if (changeType === "rename") {
      recs.push(
        "Use alias/view to maintain backward compatibility during transition",
      );
    }

    if (criticalAssets.length > 0) {
      recs.push(
        `Review impact on ${criticalAssets.length} critical assets: ${criticalAssets.map((a) => a.name).join(", ")}`,
      );
    }

    if (recs.length === 0) {
      recs.push("Standard change review process sufficient");
    }

    return recs;
  }
}

module.exports = new LineageService();
