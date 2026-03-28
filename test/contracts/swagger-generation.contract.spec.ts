import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SWAGGER_PATH = resolve(__dirname, '../../swagger.json');
const REPORT_PATH = resolve(__dirname, '../../swagger-generation-report.json');

type SwaggerSchema = {
  $ref?: string;
  allOf?: Array<{
    $ref?: string;
    type?: string;
    properties?: {
      data?: {
        $ref?: string;
      };
    };
    required?: string[];
  }>;
};

type SwaggerDocument = {
  paths: Record<
    string,
    Record<
      string,
      {
        operationId?: string;
        parameters?: Array<{ name: string; in: string }>;
        requestBody?: {
          content?: {
            'application/json'?: {
              schema?: {
                $ref?: string;
                type?: string;
                additionalProperties?: boolean;
                properties?: Record<string, unknown>;
              };
            };
          };
        };
        responses?: Record<
          string,
          {
            content?: { 'application/json'?: { schema?: SwaggerSchema } };
          }
        >;
      }
    >
  >;
};

type SwaggerReport = {
  success: boolean;
  generatedBy: string;
  paths: number;
  operations: number;
  schemas: number;
  tags: string[];
};

const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8')) as SwaggerDocument;
const report = JSON.parse(readFileSync(REPORT_PATH, 'utf-8')) as SwaggerReport;

function getResponseSchema(path: string, method: string, status: string): SwaggerSchema {
  const schema =
    swagger.paths[path]?.[method]?.responses?.[status]?.content?.['application/json']?.schema;

  if (!schema) {
    throw new Error(`Missing ${method.toUpperCase()} ${path} response schema for status ${status}`);
  }

  return schema;
}

function getOperation(path: string, method: string) {
  const operation = swagger.paths[path]?.[method];

  if (!operation) {
    throw new Error(`Missing ${method.toUpperCase()} ${path} operation`);
  }

  return operation;
}

function getOperationId(path: string, method: string): string {
  const operationId = getOperation(path, method).operationId;

  if (!operationId) {
    throw new Error(`Missing ${method.toUpperCase()} ${path} operationId`);
  }

  return operationId;
}

function getRequestSchemaRef(path: string, method: string): string | undefined {
  return getOperation(path, method).requestBody?.content?.['application/json']?.schema?.$ref;
}

function expectWrappedResponse(schema: SwaggerSchema, dtoRef: string) {
  expect(Array.isArray(schema.allOf)).toBe(true);
  expect(schema.allOf?.[0]?.$ref).toBe('#/components/schemas/ApiResponseDto');
  expect(schema.allOf?.[1]?.type).toBe('object');
  expect(schema.allOf?.[1]?.properties?.data?.$ref).toBe(dtoRef);
  expect(schema.allOf?.[1]?.required).toContain('data');
}

function expectPathParams(path: string, method: string, expectedParams: string[]) {
  const params = swagger.paths[path]?.[method]?.parameters ?? [];
  const pathParams = params.filter((param) => param.in === 'path').map((param) => param.name);

  expect(pathParams).toEqual(expectedParams);
}

test('swagger artifacts are generated from Nest Swagger', () => {
  expect(existsSync(SWAGGER_PATH)).toBe(true);
  expect(existsSync(REPORT_PATH)).toBe(true);
  expect(report.success).toBe(true);
  expect(report.generatedBy).toBe('nest-swagger');
});

test('auth session publishes wrapped success response', () => {
  const schema = getResponseSchema('/api/auth/session', 'get', '200');

  expectWrappedResponse(schema, '#/components/schemas/SessionResponseDto');
});

test('onboarding session publishes wrapped success response', () => {
  const schema = getResponseSchema('/api/v1/onboarding/session', 'get', '200');

  expectWrappedResponse(schema, '#/components/schemas/OnboardingSessionDto');
});

test('onboarding next step keeps HTTP 200 and wrapped response', () => {
  const nextResponses = swagger.paths['/api/v1/onboarding/session/next']?.post?.responses ?? {};

  expect(nextResponses['200']).toBeDefined();
  expect(nextResponses['201']).toBeUndefined();
  expectWrappedResponse(
    getResponseSchema('/api/v1/onboarding/session/next', 'post', '200'),
    '#/components/schemas/OnboardingSessionDto',
  );
});

test('onboarding next step documents raw step data request body', () => {
  const schema = getOperation('/api/v1/onboarding/session/next', 'post').requestBody?.content?.[
    'application/json'
  ]?.schema;

  expect(schema?.type).toBe('object');
  expect(schema?.additionalProperties).toBe(true);
  expect(schema?.properties).toBeUndefined();
});

test('username availability publishes wrapped success response', () => {
  const schema = getResponseSchema('/api/v1/users/username/check', 'get', '200');

  expectWrappedResponse(schema, '#/components/schemas/UsernameAvailabilityDataDto');
});

test('sdk-export controllers publish stable operation ids', () => {
  expect(getOperationId('/api/v1/users/profile', 'get')).toBe('users_getProfile');
  expect(getOperationId('/api/v1/users/username/check', 'get')).toBe(
    'users_checkUsernameAvailability',
  );
  expect(getOperationId('/api/v1/themes', 'post')).toBe('themes_createThemeForUser');
  expect(getOperationId('/api/v1/resumes/{resumeId}/config/sections/batch', 'post')).toBe(
    'resumeConfig_batchUpdate',
  );
  expect(getOperationId('/api/v1/mec/courses/search', 'get')).toBe(
    'mecCourses_searchCoursesByName',
  );
  expect(getOperationId('/api/v1/platform/stats', 'get')).toBe('platform_getStatistics');
});

test('generic handler names keep unique operation ids when sdk tags would collide', () => {
  expect(getOperationId('/api/password/forgot', 'post')).toBe('forgotPassword_handle');
  expect(getOperationId('/api/password/reset', 'post')).toBe('resetPassword_handle');
  expect(getOperationId('/api/email-verification/send', 'post')).toBe('sendVerification_handle');
});

test('documented mutation bodies are available for generated sdk payloads', () => {
  expect(getRequestSchemaRef('/api/v1/resumes', 'post')).toBe(
    '#/components/schemas/CreateResumeRequestDto',
  );
  expect(getRequestSchemaRef('/api/v1/resumes/{id}', 'patch')).toBe(
    '#/components/schemas/UpdateResumeRequestDto',
  );
  expect(getRequestSchemaRef('/api/v1/themes', 'post')).toBe(
    '#/components/schemas/CreateThemeRequestDto',
  );
  expect(getRequestSchemaRef('/api/v1/themes/{id}', 'put')).toBe(
    '#/components/schemas/UpdateThemeRequestDto',
  );
  expect(getRequestSchemaRef('/api/v1/themes/fork', 'post')).toBe(
    '#/components/schemas/ForkThemeRequestDto',
  );
  expect(getRequestSchemaRef('/api/v1/themes/apply', 'post')).toBe(
    '#/components/schemas/ApplyThemeToResumeRequestDto',
  );
  expect(getRequestSchemaRef('/api/v1/themes/approval/review', 'post')).toBe(
    '#/components/schemas/ThemeApprovalRequestDto',
  );
  expect(getRequestSchemaRef('/api/v1/users/profile', 'patch')).toBe(
    '#/components/schemas/UpdateUserProfileRequestDto',
  );
  expect(getRequestSchemaRef('/api/v1/users/username', 'patch')).toBe(
    '#/components/schemas/UpdateUsernameRequestDto',
  );
});

test('theme submission stays bodyless because the runtime only uses the path param', () => {
  expect(getOperation('/api/v1/themes/approval/{id}/submit', 'post').requestBody).toBeUndefined();
});

test('onboarding save step documents raw step data request body', () => {
  const schema = getOperation('/api/v1/onboarding/session/save', 'post').requestBody?.content?.[
    'application/json'
  ]?.schema;

  expect(schema?.type).toBe('object');
  expect(schema?.additionalProperties).toBe(true);
  expect(schema?.properties).toBeUndefined();
});

test('onboarding previous step has no request body', () => {
  expect(getOperation('/api/v1/onboarding/session/previous', 'post').requestBody).toBeUndefined();
});

test('onboarding complete-from-session has no request body', () => {
  expect(getOperation('/api/v1/onboarding/session/complete', 'post').requestBody).toBeUndefined();
});

test('resume skill update includes all path params required by Orval', () => {
  expectPathParams('/api/v1/resumes/{resumeId}/skills/{skillId}', 'patch', ['resumeId', 'skillId']);
});

test('resume skill delete includes all path params required by Orval', () => {
  expectPathParams('/api/v1/resumes/{resumeId}/skills/{skillId}', 'delete', [
    'resumeId',
    'skillId',
  ]);
});

test('swagger report summarizes a non-empty contract', () => {
  expect(report.paths).toBeGreaterThan(0);
  expect(report.operations).toBeGreaterThan(0);
  expect(report.schemas).toBeGreaterThan(0);
  expect(report.tags).toContain('auth');
  expect(report.tags).toContain('onboarding');
  expect(report.tags).toContain('users');
});
