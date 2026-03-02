import { beforeAll, describe, expect, it } from 'bun:test';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeAll(() => {
    const appService = new AppService();
    appController = new AppController(appService);
  });

  describe('root', () => {
    it('should return DataResponse with hello message', () => {
      const result = appController.getHello();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('message');
      expect(typeof result.data.message).toBe('string');
    });
  });

  describe('health', () => {
    it('should return DataResponse with health status', () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('status', 'ok');
      expect(result.data).toHaveProperty('timestamp');
      expect(typeof result.data.timestamp).toBe('string');
    });
  });

  describe('version', () => {
    it('should return DataResponse with version information', () => {
      const result = appController.getVersion();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('service', 'profile-services');
      expect(result.data).toHaveProperty('version');
      expect(result.data).toHaveProperty('contracts_version');
      expect(result.data).toHaveProperty('environment');
      expect(result.data).toHaveProperty('deployed_at');
      expect(result.data).toHaveProperty('git_tag');
      expect(result.data).toHaveProperty('is_rollback');
      expect(typeof result.data.is_rollback).toBe('boolean');
    });

    it('should use development environment when manifest not available', () => {
      const result = appController.getVersion();
      expect(result.data.environment).toBe('development');
    });
  });

  describe('openapi', () => {
    it('should return DataResponse with OpenAPI spec', () => {
      const result = appController.getOpenApiSpec();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('spec');
      expect(typeof result.data.spec).toBe('object');
    });
  });
});
