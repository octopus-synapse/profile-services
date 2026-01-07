import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import {
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  StorageHealthIndicator,
  TranslateHealthIndicator,
} from './indicators';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let dbIndicator: DatabaseHealthIndicator;
  let redisIndicator: RedisHealthIndicator;
  let storageIndicator: StorageHealthIndicator;
  let translateIndicator: TranslateHealthIndicator;

  beforeEach(async () => {
    healthCheckService = {
      check: mock(),
    } as any;

    dbIndicator = {
      isHealthy: mock(),
    } as any;

    redisIndicator = {
      isHealthy: mock(),
    } as any;

    storageIndicator = {
      isHealthy: mock(),
    } as any;

    translateIndicator = {
      isHealthy: mock(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: DatabaseHealthIndicator, useValue: dbIndicator },
        { provide: RedisHealthIndicator, useValue: redisIndicator },
        { provide: StorageHealthIndicator, useValue: storageIndicator },
        { provide: TranslateHealthIndicator, useValue: translateIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check (all services)', () => {
    it('should check all health indicators', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' },
          storage: { status: 'up' },
          translate: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          redis: { status: 'up' },
          storage: { status: 'up' },
          translate: { status: 'up' },
        },
      };
      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await controller.check();

      expect(result).toEqual(mockResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should invoke all health indicators when called', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockImplementation(async (checks) => {
        // Execute all health check functions
        checks.forEach((fn) => fn());
        return mockResult;
      });

      await controller.check();

      expect(dbIndicator.isHealthy).toHaveBeenCalledWith('database');
      expect(redisIndicator.isHealthy).toHaveBeenCalledWith('redis');
      expect(storageIndicator.isHealthy).toHaveBeenCalledWith('storage');
      expect(translateIndicator.isHealthy).toHaveBeenCalledWith('translate');
    });
  });

  describe('checkDatabase', () => {
    it('should check only database health', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await controller.checkDatabase();

      expect(result).toEqual(mockResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });

    it('should invoke database health indicator when called', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockImplementation(async (checks) => {
        checks.forEach((fn) => fn());
        return mockResult;
      });

      await controller.checkDatabase();

      expect(dbIndicator.isHealthy).toHaveBeenCalledWith('database');
      expect(redisIndicator.isHealthy).not.toHaveBeenCalled();
      expect(storageIndicator.isHealthy).not.toHaveBeenCalled();
      expect(translateIndicator.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('checkRedis', () => {
    it('should check only redis health', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: { redis: { status: 'up' } },
        error: {},
        details: { redis: { status: 'up' } },
      };
      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await controller.checkRedis();

      expect(result).toEqual(mockResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });

    it('should invoke redis health indicator when called', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockImplementation(async (checks) => {
        checks.forEach((fn) => fn());
        return mockResult;
      });

      await controller.checkRedis();

      expect(redisIndicator.isHealthy).toHaveBeenCalledWith('redis');
      expect(dbIndicator.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('checkStorage', () => {
    it('should check only storage health', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: { storage: { status: 'up' } },
        error: {},
        details: { storage: { status: 'up' } },
      };
      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await controller.checkStorage();

      expect(result).toEqual(mockResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });

    it('should invoke storage health indicator when called', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockImplementation(async (checks) => {
        checks.forEach((fn) => fn());
        return mockResult;
      });

      await controller.checkStorage();

      expect(storageIndicator.isHealthy).toHaveBeenCalledWith('storage');
      expect(dbIndicator.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('checkTranslate', () => {
    it('should check only translate service health', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: { translate: { status: 'up' } },
        error: {},
        details: { translate: { status: 'up' } },
      };
      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await controller.checkTranslate();

      expect(result).toEqual(mockResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });

    it('should invoke translate health indicator when called', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockImplementation(async (checks) => {
        checks.forEach((fn) => fn());
        return mockResult;
      });

      await controller.checkTranslate();

      expect(translateIndicator.isHealthy).toHaveBeenCalledWith('translate');
      expect(dbIndicator.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle health check failures for all services', async () => {
      const mockErrorResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Connection failed' },
          redis: { status: 'down', message: 'Connection timeout' },
        },
        details: {
          database: { status: 'down', message: 'Connection failed' },
          redis: { status: 'down', message: 'Connection timeout' },
          storage: { status: 'up' },
          translate: { status: 'up' },
        },
      };
      healthCheckService.check.mockResolvedValue(mockErrorResult);

      const result = await controller.check();

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      if (result.error) {
        expect(Object.keys(result.error).length).toBeGreaterThan(0);
      }
    });

    it('should handle database health check failure', async () => {
      const mockErrorResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Connection refused' },
        },
        details: {
          database: { status: 'down', message: 'Connection refused' },
        },
      };
      healthCheckService.check.mockResolvedValue(mockErrorResult);

      const result = await controller.checkDatabase();

      expect(result.status).toBe('error');
      expect(result.error?.database).toBeDefined();
    });
  });
});
