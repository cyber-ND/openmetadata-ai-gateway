const axios = require("axios");
const config = require("../config");

const client = axios.create({
  baseURL: config.openMetadata.baseUrl,
  timeout: config.openMetadata.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

class OpenMetadataService {
  async validateToken(token) {
    try {
      const response = await client.get("/api/v1/users/loggedInUser", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw this._normalizeError(error, "AUTH_INVALID");
    }
  }

  async askAI(query, userId, token) {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const semanticResponse = await client.post(
          "/api/v1/search/vector/query",
          { query: query, size: 10 },
          { headers }
        );

        if (semanticResponse.data?.hits?.hits?.length > 0) {
          return this._formatSearchResponse(semanticResponse.data, query, "semantic");
        }
      } catch (err) {
        // Semantic search not available, fall through
      }

      const searchResponse = await client.get(
        `/api/v1/search/query?q=${encodeURIComponent(query)}&size=10`,
        { headers }
      );

      return this._formatSearchResponse(searchResponse.data, query, "standard");
    } catch (error) {
      throw this._normalizeError(error, "AI_QUERY_FAILED");
    }
  }

  async getLineage(entityType, fqn, upstreamDepth = 1, downstreamDepth = 3, token) {
    try {
      const encodedFQN = encodeURIComponent(fqn);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await client.get(
        `/api/v1/lineage/${entityType}/${encodedFQN}?upstreamDepth=${upstreamDepth}&downstreamDepth=${downstreamDepth}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw this._normalizeError(error, "LINEAGE_FETCH_FAILED");
    }
  }

  async searchEntities(query, filters = {}, token) {
    try {
      const params = new URLSearchParams({ q: query });
      if (filters.entityType) params.append("entityType", filters.entityType);
      if (filters.tags) params.append("tags", filters.tags);

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await client.get(`/api/v1/search/query?${params}`, { headers });
      return response.data;
    } catch (error) {
      throw this._normalizeError(error, "SEARCH_ENTITIES_FAILED");
    }
  }

  async getEntityByFQN(fqn, entityType = "tables", token) {
    try {
      const encodedFQN = encodeURIComponent(fqn);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await client.get(
        `/api/v1/${entityType}/name/${encodedFQN}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw this._normalizeError(error, "ENTITY_NOT_FOUND");
    }
  }

  async getDataQualityTests(entityFQN, token) {
    try {
      const encodedFQN = encodeURIComponent(entityFQN);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await client.get(
        `/api/v1/testCase?entityLink=${encodedFQN}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw this._normalizeError(error, "TESTS_FETCH_FAILED");
    }
  }

  async getTableSchema(tableFQN, token) {
    try {
      const encodedFQN = encodeURIComponent(tableFQN);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await client.get(
        `/api/v1/tables/name/${encodedFQN}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw this._normalizeError(error, "SCHEMA_FETCH_FAILED");
    }
  }

  _formatSearchResponse(searchData, originalQuery, searchType) {
    const hits = searchData.hits?.hits || [];

    const sources = hits.map((hit) => {
      const source = hit._source || hit;
      return {
        name: source.name || source.displayName,
        fullyQualifiedName: source.fullyQualifiedName,
        entityType: source.entityType || source.entity_type,
        description: source.description,
        score: hit._score || hit.score,
      };
    });

    const answer = this._generateAnswerFromResults(sources, originalQuery);

    return {
      answer,
      sources,
      query: originalQuery,
      searchType,
      totalResults: searchData.hits?.total?.value || sources.length,
    };
  }

  _generateAnswerFromResults(sources, query) {
    if (sources.length === 0) {
      return `I couldn't find any relevant information for "${query}" in the catalog.`;
    }

    const entityTypes = [
      ...new Set(sources.map((s) => s.entityType).filter(Boolean)),
    ];
    const typeStr =
      entityTypes.length > 1
        ? `${entityTypes.slice(0, -1).join(", ")} and ${entityTypes.slice(-1)}`
        : entityTypes[0] || "items";

    return (
      `Found ${sources.length} ${typeStr}(s) related to "${query}". ` +
      `Top results: ${sources.slice(0, 3).map((s) => s.name).join(", ")}.`
    );
  }

    // Get lineage using entity ID (UUID) instead of FQN
  async getLineageById(entityType, entityId, upstreamDepth = 1, downstreamDepth = 3, token) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await client.get(
        `/api/v1/lineage/${entityType}/${entityId}?upstreamDepth=${upstreamDepth}&downstreamDepth=${downstreamDepth}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw this._normalizeError(error, "LINEAGE_FETCH_FAILED");
    }
  }

    async getTestCaseById(testCaseId, token) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await client.get(
        `/api/v1/dataQuality/testCases/${testCaseId}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw this._normalizeError(error, "TEST_CASE_NOT_FOUND");
    }
  }

  _normalizeError(error, defaultCode) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      const codeMap = {
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        429: "RATE_LIMITED",
        500: "OM_SERVER_ERROR",
      };

      const errorObj = new Error(message);
      errorObj.statusCode = status;
      errorObj.code = codeMap[status] || defaultCode;
      errorObj.source = "openmetadata";
      return errorObj;
    }

    const errorObj = new Error(error.message);
    errorObj.statusCode = 503;
    errorObj.code = "SERVICE_UNAVAILABLE";
    errorObj.source = "openmetadata";
    return errorObj;
  }
}

module.exports = new OpenMetadataService();