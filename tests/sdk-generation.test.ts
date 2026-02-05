/**
 * SDK Generation Tests
 *
 * Tests to validate that swagger.json generates correct SDK with proper types.
 * These tests ensure that our OpenAPI spec is correct and usable by frontend.
 *
 * Run: bun test tests/sdk-generation.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('SDK Generation - Swagger Spec Validation', () => {
  test('swagger-test.json has correct structure', () => {
    const swaggerPath = resolve(__dirname, '../swagger-test.json');
    const swagger = JSON.parse(readFileSync(swaggerPath, 'utf-8'));

    // Should have OpenAPI version
    expect(swagger.openapi).toBe('3.0.0');

    // Should have paths
    expect(swagger.paths).toBeDefined();
    expect(Object.keys(swagger.paths)).toContain('/api/resume-import/json');
    expect(Object.keys(swagger.paths)).toContain(
      '/api/resume-import/{importId}',
    );
  });

  test('resume-import endpoints have correct operations', () => {
    const swaggerPath = resolve(__dirname, '../swagger-test.json');
    const swagger = JSON.parse(readFileSync(swaggerPath, 'utf-8'));

    // POST /api/resume-import/json
    const importJson = swagger.paths['/api/resume-import/json']?.post;
    expect(importJson).toBeDefined();
    expect(importJson.operationId).toBe('importJson');
    expect(importJson.tags).toContain('resume-import');

    // GET /api/resume-import/{importId}
    const getStatus = swagger.paths['/api/resume-import/{importId}']?.get;
    expect(getStatus).toBeDefined();
    expect(getStatus.operationId).toBe('getImportStatus');
    expect(getStatus.parameters).toBeDefined();
    expect(getStatus.parameters[0].name).toBe('importId');
  });

  test('components/schemas has all DTOs', () => {
    const swaggerPath = resolve(__dirname, '../swagger-test.json');
    const swagger = JSON.parse(readFileSync(swaggerPath, 'utf-8'));

    const schemas = swagger.components?.schemas;
    expect(schemas).toBeDefined();
    expect(schemas.JsonResumeSchemaDto).toBeDefined();
    expect(schemas.ImportResultDto).toBeDefined();
    expect(schemas.ImportJobDto).toBeDefined();
  });

  test('ImportResultDto has correct structure', () => {
    const swaggerPath = resolve(__dirname, '../swagger-test.json');
    const swagger = JSON.parse(readFileSync(swaggerPath, 'utf-8'));

    const importResult = swagger.components.schemas.ImportResultDto;
    expect(importResult.type).toBe('object');
    expect(importResult.properties.importId).toBeDefined();
    expect(importResult.properties.status).toBeDefined();
    expect(importResult.properties.status.enum).toEqual([
      'pending',
      'processing',
      'completed',
      'failed',
    ]);
  });

  test('ImportJobDto has required fields', () => {
    const swaggerPath = resolve(__dirname, '../swagger-test.json');
    const swagger = JSON.parse(readFileSync(swaggerPath, 'utf-8'));

    const importJob = swagger.components.schemas.ImportJobDto;
    expect(importJob.type).toBe('object');
    expect(importJob.properties.id).toBeDefined();
    expect(importJob.properties.userId).toBeDefined();
    expect(importJob.properties.status).toBeDefined();
    expect(importJob.properties.createdAt).toBeDefined();
    expect(importJob.properties.createdAt.format).toBe('date-time');
  });

  test('JsonResumeSchemaDto structure', () => {
    const swaggerPath = resolve(__dirname, '../swagger-test.json');
    const swagger = JSON.parse(readFileSync(swaggerPath, 'utf-8'));

    const jsonResume = swagger.components.schemas.JsonResumeSchemaDto;
    expect(jsonResume.type).toBe('object');
    expect(jsonResume.properties.basics).toBeDefined();
    expect(jsonResume.properties.basics.type).toBe('object');
    expect(jsonResume.properties.basics.properties.name).toBeDefined();
    expect(jsonResume.properties.basics.properties.email).toBeDefined();
  });
});

describe('SDK Generation - Operation Definitions', () => {
  test('POST /api/resume-import/json request body is correct', () => {
    const swaggerPath = resolve(__dirname, '../swagger-test.json');
    const swagger = JSON.parse(readFileSync(swaggerPath, 'utf-8'));

    const operation = swagger.paths['/api/resume-import/json'].post;
    expect(operation.requestBody.required).toBe(true);
    expect(operation.requestBody.content['application/json']).toBeDefined();

    const schema = operation.requestBody.content['application/json'].schema;
    expect(schema.$ref).toBe('#/components/schemas/JsonResumeSchemaDto');
  });

  test('POST /api/resume-import/json response is correct', () => {
    const swaggerPath = resolve(__dirname, '../swagger-test.json');
    const swagger = JSON.parse(readFileSync(swaggerPath, 'utf-8'));

    const operation = swagger.paths['/api/resume-import/json'].post;
    const response201 = operation.responses['201'];

    expect(response201).toBeDefined();
    expect(response201.description).toBe('Import started successfully');

    const schema = response201.content['application/json'].schema;
    expect(schema.$ref).toBe('#/components/schemas/ImportResultDto');
  });

  test('GET /api/resume-import/{importId} parameters are correct', () => {
    const swaggerPath = resolve(__dirname, '../swagger-test.json');
    const swagger = JSON.parse(readFileSync(swaggerPath, 'utf-8'));

    const operation = swagger.paths['/api/resume-import/{importId}'].get;
    const params = operation.parameters;

    expect(params).toHaveLength(1);
    expect(params[0].name).toBe('importId');
    expect(params[0].in).toBe('path');
    expect(params[0].required).toBe(true);
    expect(params[0].schema.type).toBe('string');
  });
});
