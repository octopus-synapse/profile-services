import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SWAGGER_PATH = resolve(__dirname, '../../swagger.json');
const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8')) as {
  openapi: string;
  components?: {
    securitySchemes?: Record<string, { type?: string; scheme?: string }>;
    schemas?: Record<
      string,
      {
        required?: string[];
        properties?: Record<string, { enum?: string[] }>;
      }
    >;
  };
  paths: Record<
    string,
    Record<
      string,
      {
        operationId?: string;
        tags?: string[];
        security?: Array<Record<string, unknown>>;
        requestBody?: unknown;
        responses?: Record<string, unknown>;
      }
    >
  >;
};

function getOperation(path: string, method: string) {
  const operation = swagger.paths[path]?.[method];

  if (!operation) {
    throw new Error(`Missing ${method.toUpperCase()} ${path} in swagger.json`);
  }

  return operation;
}

describe('Swagger Completeness - Resume Import coverage', () => {
  test('swagger.json exists and exposes OpenAPI paths', () => {
    expect(swagger.openapi).toBeDefined();
    expect(Object.keys(swagger.paths).length).toBeGreaterThan(0);
  });

  test('resume-import endpoints are documented', () => {
    expect(swagger.paths['/api/resume-import/json']?.post).toBeDefined();
    expect(swagger.paths['/api/resume-import/parse']?.post).toBeDefined();
    expect(swagger.paths['/api/resume-import/{importId}']?.get).toBeDefined();
    expect(swagger.paths['/api/resume-import/{importId}']?.delete).toBeDefined();
    expect(swagger.paths['/api/resume-import']?.get).toBeDefined();
    expect(swagger.paths['/api/resume-import/{importId}/retry']?.post).toBeDefined();
  });

  test('resume-import operationIds use stable sdk-export naming', () => {
    const operations = [
      getOperation('/api/resume-import/json', 'post'),
      getOperation('/api/resume-import/parse', 'post'),
      getOperation('/api/resume-import/{importId}', 'get'),
      getOperation('/api/resume-import/{importId}', 'delete'),
      getOperation('/api/resume-import', 'get'),
      getOperation('/api/resume-import/{importId}/retry', 'post'),
    ];

    operations.forEach((operation) => {
      expect(operation.operationId).toBeDefined();
      expect(operation.operationId).toMatch(/^resumeImport_/);
      expect(operation.tags).toContain('Resume Import');
      expect(operation.security).toContainEqual({ 'JWT-auth': [] });
    });
  });
});

describe('Swagger Completeness - Schema sanity', () => {
  test('required import schemas are present', () => {
    const schemas = swagger.components?.schemas ?? {};

    expect(schemas.ImportResultDto).toBeDefined();
    expect(schemas.ImportJobDto).toBeDefined();
    expect(schemas.ParsedResumeDataDto).toBeDefined();
    expect(schemas.LoginDto).toBeDefined();
    expect(schemas.CreateAccountDto).toBeDefined();
  });

  test('ImportJobDto retains essential fields used by consumers', () => {
    const dto = swagger.components?.schemas?.ImportJobDto;

    expect(dto).toBeDefined();
    expect(dto?.required).toContain('id');
    expect(dto?.required).toContain('status');
    expect(dto?.required).toContain('source');
    expect(dto?.required).toContain('createdAt');
    expect(dto?.properties?.id).toBeDefined();
    expect(dto?.properties?.status).toBeDefined();
    expect(dto?.properties?.source).toBeDefined();
    expect(dto?.properties?.createdAt).toBeDefined();
  });

  test('ImportJobDto source enum includes supported documented sources', () => {
    const source = swagger.components?.schemas?.ImportJobDto?.properties?.source;

    expect(source?.enum).toContain('JSON');
    expect(source?.enum).toContain('PDF');
    expect(source?.enum).toContain('LINKEDIN');
  });
});

describe('Swagger Completeness - Structural invariants', () => {
  test('has security schemes defined', () => {
    const securitySchemes = swagger.components?.securitySchemes ?? {};

    expect(securitySchemes['JWT-auth']).toBeDefined();
    expect(securitySchemes['JWT-auth']?.type).toBe('http');
    expect(securitySchemes['JWT-auth']?.scheme).toBe('bearer');
  });

  test('all operations have tags and responses', () => {
    Object.values(swagger.paths).forEach((methods) => {
      Object.values(methods).forEach((operation) => {
        expect(operation.tags).toBeDefined();
        expect(operation.tags?.length).toBeGreaterThan(0);
        expect(operation.responses).toBeDefined();
        expect(Object.keys(operation.responses ?? {}).length).toBeGreaterThan(0);
      });
    });
  });

  test('documented state-changing endpoints that accept payloads have requestBody', () => {
    const payloadEndpoints: Array<[string, string]> = [
      ['/api/resume-import/json', 'post'],
      ['/api/resume-import/parse', 'post'],
      ['/api/resume-import/{importId}/retry', 'post'],
      ['/api/accounts', 'post'],
      ['/api/auth/login', 'post'],
      ['/api/v1/onboarding/session/next', 'post'],
      ['/api/v1/onboarding/session/goto', 'post'],
      ['/api/v1/onboarding/session/save', 'post'],
      ['/api/v1/users/username/check', 'get'],
    ];

    payloadEndpoints
      .filter(([, method]) => method !== 'get')
      .forEach(([path, method]) => {
        expect(
          getOperation(path, method).requestBody,
          `${method.toUpperCase()} ${path} should have requestBody`,
        ).toBeDefined();
      });
  });
});
