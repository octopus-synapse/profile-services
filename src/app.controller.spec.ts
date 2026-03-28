import { beforeAll, describe, expect, it } from 'bun:test';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeAll(() => {
    appController = new AppController();
  });

  describe('root', () => {
    it('should return DataResponse with hello message', () => {
      const result = appController.getHello();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      if (!result.data) throw new Error('Expected data');
      const data = result.data;
      expect(data).toHaveProperty('message');
      expect(typeof data.message).toBe('string');
    });
  });

  describe('health', () => {
    it('should return DataResponse with health status', () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      if (!result.data) throw new Error('Expected data');
      const data = result.data;
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('string');
    });
  });

  describe('version', () => {
    it('should return DataResponse with version information', () => {
      const result = appController.getVersion();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      if (!result.data) throw new Error('Expected data');
      const data = result.data;
      expect(data).toHaveProperty('service', 'profile-services');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('contracts_version');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('deployed_at');
      expect(data).toHaveProperty('git_tag');
      expect(data).toHaveProperty('is_rollback');
      expect(typeof data.is_rollback).toBe('boolean');
    });

    it('should use development environment when manifest not available', () => {
      const result = appController.getVersion();
      expect(result).toHaveProperty('data');
      if (!result.data) throw new Error('Expected data');
      const data = result.data;
      expect(data.environment).toBe('development');
    });
  });

  describe('openapi', () => {
    it('should return DataResponse with OpenAPI spec', () => {
      const result = appController.getOpenApiSpec();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      if (!result.data) throw new Error('Expected data');
      const data = result.data;
      expect(data).toHaveProperty('spec');
      expect(typeof data.spec).toBe('object');
    });
  });
});
