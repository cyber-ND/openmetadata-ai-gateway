// config/swagger.js
// Standalone OpenAPI 3.0 specification
// Manually maintained with accurate examples from sandbox testing

const config = require('./index');

module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'OpenMetadata AI Gateway',
    version: '1.0.0',
    description: 'Natural language interface for OpenMetadata data catalog operations. Proxies and enhances OpenMetadata REST API with AI-powered endpoints for querying, impact analysis, SQL generation, and alerting.',
    contact: {
      name: 'Hackathon Team',
      url: 'https://github.com/cyber-ND/openmetadata-ai-gateway'
    },
    license: {
      name: 'MIT'
    }
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/v1`,
      description: 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'OpenMetadata Personal Access Token. Generate from Profile > Access Tokens in the OM UI.'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Validation failed' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string', example: '/api/v1/ask' },
          details: { type: 'object' }
        }
      },
      AskRequest: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            maxLength: 500,
            example: 'customer',
            description: 'Natural language search term for catalog entities'
          }
        }
      },
      AskResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          timestamp: { type: 'string', format: 'date-time' },
          data: {
            type: 'object',
            properties: {
              query: { type: 'string', example: 'customer' },
              answer: { type: 'string', example: 'Found 10 table(s) related to "customer". Top results: dim_customer, dim_customers, customer_metrics.' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'dim_customer' },
                    fqn: { type: 'string', example: 'sample_redshift.staging_db.integration.dim_customer' },
                    type: { type: 'string', example: 'table' },
                    description: { type: 'string' },
                    url: { type: 'string', example: 'https://sandbox.open-metadata.org/table/sample_redshift.staging_db.integration.dim_customer' }
                  }
                }
              },
              confidence: { type: 'string', example: 'medium' }
            }
          },
          meta: {
            type: 'object',
            properties: {
              requestId: { type: 'string' }
            }
          }
        }
      },
      ImpactRequest: {
        type: 'object',
        required: ['table', 'change'],
        properties: {
          table: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_]+(\\.[a-zA-Z0-9_]+){2,}$',
            example: 'sample_redshift.staging_db.integration.dim_customer',
            description: 'Fully Qualified Name of table (3+ dot-separated parts)'
          },
          change: {
            type: 'string',
            maxLength: 200,
            example: 'rename column customer_id to user_id',
            description: 'Description of proposed schema change'
          }
        }
      },
      ImpactResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          timestamp: { type: 'string', format: 'date-time' },
          data: {
            type: 'object',
            properties: {
              table: { type: 'string', example: 'sample_redshift.staging_db.integration.dim_customer' },
              change: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  type: { type: 'string', enum: ['rename', 'deletion', 'type_change', 'constraint_change', 'modification', 'addition'] },
                  severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
                }
              },
              summary: { type: 'string', example: 'Changing sample_redshift.staging_db.integration.dim_customer (rename) affects 0 downstream assets with low risk.' },
              riskScore: { type: 'integer', minimum: 0, maximum: 10, example: 0 },
              riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'low' },
              affectedAssets: {
                type: 'object',
                properties: {
                  upstream: { type: 'array' },
                  downstream: { type: 'array' },
                  totalUpstream: { type: 'integer' },
                  totalDownstream: { type: 'integer' },
                  criticalCount: { type: 'integer' }
                }
              },
              recommendations: {
                type: 'array',
                items: { type: 'string' },
                example: ['Use alias/view to maintain backward compatibility during transition']
              }
            }
          }
        }
      },
      SQLRequest: {
        type: 'object',
        required: ['question'],
        properties: {
          question: {
            type: 'string',
            maxLength: 500,
            example: 'Show me total revenue by customer region',
            description: 'Natural language SQL question'
          },
          tables: {
            type: 'array',
            maxItems: 10,
            items: { type: 'string' },
            example: ['sample_redshift.staging_db.integration.dim_customer'],
            description: 'Optional specific tables to use'
          }
        }
      },
      SQLResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          timestamp: { type: 'string', format: 'date-time' },
          data: {
            type: 'object',
            properties: {
              sql: { type: 'string', example: 'SELECT customer_region, SUM(revenue) FROM dim_customer GROUP BY customer_region LIMIT 100;' },
              explanation: { type: 'string', example: 'Generated SQL using 1 table(s)' },
              tablesUsed: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    fqn: { type: 'string' },
                    columns: { type: 'array', items: { type: 'string' } }
                  }
                }
              },
              warnings: { type: 'array', items: { type: 'string' } },
              estimatedComplexity: { type: 'string', enum: ['simple', 'moderate', 'complex'] }
            }
          }
        }
      },
      AlertRequest: {
        type: 'object',
        required: ['testCaseId', 'channels'],
        properties: {
          testCaseId: {
            type: 'string',
            example: '803e26db-eea4-4e24-99ce-a57cd80117fd',
            description: 'UUID of the data quality test case'
          },
          channels: {
            type: 'array',
            minItems: 1,
            maxItems: 5,
            items: {
              type: 'string',
              enum: ['slack', 'email', 'webhook', 'pagerduty', 'teams']
            },
            example: ['slack', 'email']
          }
        }
      },
      AlertResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          timestamp: { type: 'string', format: 'date-time' },
          data: {
            type: 'object',
            properties: {
              testCaseId: { type: 'string' },
              alertSent: { type: 'boolean' },
              channels: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    channel: { type: 'string' },
                    sent: { type: 'boolean' },
                    preview: { type: 'string', example: '🚨 *MEDIUM* | Test *customer_id_test_library_tcu_5* Failed on `unknown`' },
                    payload: { type: 'object' }
                  }
                }
              },
              summary: { type: 'string' }
            }
          }
        }
      }
    }
  },
  security: [
    { bearerAuth: [] }
  ],
  paths: {
    '/ask': {
      post: {
        tags: ['AI Query'],
        summary: 'Natural language catalog query',
        description: 'Search data catalog using natural language. Returns matching entities with metadata.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AskRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Search results with AI-formatted response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AskResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '401': {
            description: 'Invalid or missing token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/impact': {
      post: {
        tags: ['Impact Analysis'],
        summary: 'Analyze change impact',
        description: 'Analyzes downstream lineage to determine risk and affected assets for proposed schema changes. Uses entity UUID lookup internally.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ImpactRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Impact analysis with risk score',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ImpactResponse' }
              }
            }
          },
          '400': {
            description: 'Invalid FQN format or missing fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/sql': {
      post: {
        tags: ['SQL Generation'],
        summary: 'Generate SQL from natural language',
        description: 'Generates SQL queries using catalog schema context. Searches relevant tables and builds SQL based on column metadata.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SQLRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Generated SQL with table context',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SQLResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/alerts': {
      post: {
        tags: ['Alerts'],
        summary: 'Send data quality alerts',
        description: 'Fetches test case results and formats alert payloads for external channels (Slack, Email, etc.).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AlertRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Alerts formatted and ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AlertResponse' }
              }
            }
          },
          '400': {
            description: 'Invalid test case ID or channels',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    }
  }
};