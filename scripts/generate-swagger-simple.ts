/**
 * Generate minimal Swagger JSON for resume-import endpoints
 *
 * Pragmatic approach: manually define the spec based on documented DTOs.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const swagger = {
  openapi: '3.0.0',
  info: {
    title: 'ProFile API',
    description: 'ProFile Resume & Portfolio Management API',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development Server',
    },
  ],
  tags: [
    { name: 'auth', description: 'Authentication endpoints' },
    {
      name: 'resume-import',
      description: 'Resume import from JSON Resume format',
    },
  ],
  paths: {
    '/api/v1/auth/signup': {
      post: {
        operationId: 'auth_signup',
        tags: ['auth'],
        summary: 'Register new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterCredentials' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        operationId: 'auth_login',
        tags: ['auth'],
        summary: 'Login user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginCredentials' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/resume-import/json': {
      post: {
        operationId: 'resumeImport_importFromJson',
        tags: ['resume-import'],
        summary: 'Import resume from JSON Resume format',
        security: [{ 'JWT-auth': [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JsonResumeSchemaDto' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Import started successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ImportResultDto' },
              },
            },
          },
        },
      },
    },
    '/api/resume-import/parse': {
      post: {
        operationId: 'resumeImport_parseJson',
        tags: ['resume-import'],
        summary: 'Parse JSON Resume without saving',
        security: [{ 'JWT-auth': [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JsonResumeSchemaDto' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Resume parsed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ParsedResumeDataDto' },
              },
            },
          },
        },
      },
    },
    '/api/resume-import/{importId}': {
      get: {
        operationId: 'resumeImport_getStatus',
        tags: ['resume-import'],
        summary: 'Get import job status',
        security: [{ 'JWT-auth': [] }],
        parameters: [
          {
            name: 'importId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Import status retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ImportJobDto' },
              },
            },
          },
        },
      },
      delete: {
        operationId: 'resumeImport_cancel',
        tags: ['resume-import'],
        summary: 'Cancel pending import',
        security: [{ 'JWT-auth': [] }],
        parameters: [
          {
            name: 'importId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Import cancelled successfully',
          },
        },
      },
    },
    '/api/resume-import': {
      get: {
        operationId: 'resumeImport_getHistory',
        tags: ['resume-import'],
        summary: 'Get import history',
        security: [{ 'JWT-auth': [] }],
        responses: {
          '200': {
            description: 'Import history retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ImportJobDto' },
                },
              },
            },
          },
        },
      },
    },
    '/api/resume-import/{importId}/retry': {
      post: {
        operationId: 'resumeImport_retry',
        tags: ['resume-import'],
        summary: 'Retry failed import',
        security: [{ 'JWT-auth': [] }],
        parameters: [
          {
            name: 'importId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '201': {
            description: 'Import retry started',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ImportResultDto' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      'JWT-auth': {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      RegisterCredentials: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          username: { type: 'string' },
          fullName: { type: 'string' },
        },
      },
      LoginCredentials: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'number' },
        },
      },
      UserInfo: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string', nullable: true },
          fullName: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/UserInfo' },
          tokens: { $ref: '#/components/schemas/AuthTokens' },
        },
      },
      JsonResumeSchemaDto: {
        type: 'object',
        properties: {
          basics: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              label: { type: 'string' },
              email: { type: 'string', format: 'email' },
              phone: { type: 'string' },
              url: { type: 'string', format: 'uri' },
              summary: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  address: { type: 'string' },
                  postalCode: { type: 'string' },
                  city: { type: 'string' },
                  countryCode: { type: 'string' },
                  region: { type: 'string' },
                },
              },
            },
          },
          work: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                position: { type: 'string' },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
                summary: { type: 'string' },
                highlights: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          education: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                institution: { type: 'string' },
                area: { type: 'string' },
                studyType: { type: 'string' },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
              },
            },
          },
          skills: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                level: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      ImportResultDto: {
        type: 'object',
        required: ['importId', 'status'],
        properties: {
          importId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
          },
          resumeId: { type: 'string', nullable: true },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
      ParsedResumeDataDto: {
        type: 'object',
        properties: {
          personalInfo: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
            },
          },
          experiences: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                company: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
              },
            },
          },
        },
      },
      ImportJobDto: {
        type: 'object',
        required: ['id', 'userId', 'source', 'status', 'createdAt'],
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          source: { type: 'string', enum: ['JSON', 'PDF', 'DOCX', 'LINKEDIN'] },
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
          },
          data: { $ref: '#/components/schemas/JsonResumeSchemaDto' },
          parsedData: { $ref: '#/components/schemas/ParsedResumeDataDto' },
          resumeId: { type: 'string', nullable: true },
          errors: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

const outputPath = resolve(__dirname, '../swagger.json');
writeFileSync(outputPath, JSON.stringify(swagger, null, 2));

console.log('✅ Swagger JSON generated:', outputPath);
console.log('📊 Endpoints:', Object.keys(swagger.paths).length);
console.log('🏷️  Schemas:', Object.keys(swagger.components.schemas).length);
