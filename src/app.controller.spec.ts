import { describe, it, expect, beforeAll } from 'bun:test';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeAll(() => {
    const appService = new AppService();
    appController = new AppController(appService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('version', () => {
    it('should return version information', () => {
      const result = appController.getVersion();
      expect(result).toHaveProperty('service', 'profile-services');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('contracts_version');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('deployed_at');
      expect(result).toHaveProperty('git_tag');
      expect(result).toHaveProperty('is_rollback');
      expect(typeof result.is_rollback).toBe('boolean');
    });

    it('should use development environment when manifest not available', () => {
      const result = appController.getVersion();
      expect(result.environment).toBe('development');
    });
  });
});
