/**
 * Generate OpenAPI Specification from Zod Schemas
 *
 * This script generates an OpenAPI 3.1 spec directly from Zod schemas,
 * making Zod the SINGLE SOURCE OF TRUTH for:
 * - TypeScript types
 * - Runtime validation
 * - API documentation
 *
 * Usage: bun run src/scripts/generate-openapi.ts
 */

import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// Import schemas from shared-kernel
import {
  RegisterCredentialsSchema,
  LoginCredentialsSchema,
  RefreshTokenSchema,
} from '../shared-kernel/schemas';

// Define response schemas inline (these are API-specific)
const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

const UserInfoSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  username: z.string().nullable(),
  fullName: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
});

const AuthResponseSchema = z.object({
  user: UserInfoSchema,
  tokens: AuthTokensSchema,
});

const ApiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  error: z.string().optional(),
  details: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

// Create registry
const registry = new OpenAPIRegistry();

// ============================================================================
// Register Schemas
// ============================================================================

// Auth schemas
registry.register('RegisterCredentials', RegisterCredentialsSchema);
registry.register('LoginCredentials', LoginCredentialsSchema);
registry.register('RefreshToken', RefreshTokenSchema);
registry.register('AuthResponse', AuthResponseSchema);
registry.register('UserInfo', UserInfoSchema);
registry.register('ApiError', ApiErrorSchema);

// ============================================================================
// Register Paths
// ============================================================================

// POST /api/v1/auth/signup
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/signup',
  tags: ['auth'],
  summary: 'Register a new user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterCredentialsSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User successfully registered',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid input data',
      content: {
        'application/json': {
          schema: ApiErrorSchema,
        },
      },
    },
    409: {
      description: 'Email already registered',
      content: {
        'application/json': {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// POST /api/v1/auth/login
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['auth'],
  summary: 'Login with email and password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginCredentialsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// POST /api/v1/auth/refresh
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/refresh',
  tags: ['auth'],
  summary: 'Refresh JWT token using refresh token',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RefreshTokenSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Token refreshed successfully',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid refresh token',
      content: {
        'application/json': {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// GET /api/v1/auth/me
registry.registerPath({
  method: 'get',
  path: '/api/v1/auth/me',
  tags: ['auth'],
  summary: 'Get current authenticated user info',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User info retrieved successfully',
      content: {
        'application/json': {
          schema: UserInfoSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// ============================================================================
// Generate OpenAPI Document
// ============================================================================

const generator = new OpenApiGeneratorV31(registry.definitions);

const document = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Profile Services API',
    version: '1.0.0',
    description: 'Professional Resume Builder API - Generated from Zod schemas',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
  ],
  security: [],
});

// Add security scheme
document.components = document.components ?? {};
document.components.securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
};

// Write to file
const outputPath = resolve(__dirname, '../../openapi.json');
writeFileSync(outputPath, JSON.stringify(document, null, 2));

console.log(`✅ OpenAPI spec generated: ${outputPath}`);
console.log(`   Schemas: ${Object.keys(registry.definitions).length}`);
