import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { HealthCheckService } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckResultDto, HealthController } from './health.controller';
import {
  DatabaseHealthIndicator,
  OpenAIHealthIndicator,
  RedisHealthIndicator,
  SmtpHealthIndicator,
  StorageHealthIndicator,
  TranslateHealthIndicator,
} from './indicators';

// Factory functions for creating mock services with different behaviors
const createHealthCheckService = (options?: {
  result?: HealthCheckResultDto;
  invokeChecks?: boolean;
}) => {
  const defaultResult: HealthCheckResultDto = {
    status: 'ok',
    info: {},
    error: {},
    details: {},
  };

  return {
    check: options?.invokeChecks
      ? mock(async (checks: Array<() => void>) => {
          checks.forEach((fn) => {
            fn();
          });
          return options.result ?? defaultResult;
        })
      : mock(() => Promise.resolve(options?.result ?? defaultResult)),
  };
};

const createIndicator = () => ({
  isHealthy: mock(() => Promise.resolve({ status: 'up' })),
});

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: ReturnType<typeof createHealthCheckService>;
  let dbIndicator: ReturnType<typeof createIndicator>;
  let redisIndicator: ReturnType<typeof createIndicator>;
  let storageIndicator: ReturnType<typeof createIndicator>;
  let translateIndicator: ReturnType<typeof createIndicator>;
  let smtpIndicator: ReturnType<typeof createIndicator>;
  let openAIIndicator: ReturnType<typeof createIndicator>;

  const setupController = async (
    healthCheckOptions?: Parameters<typeof createHealthCheckService>[0],
  ) => {
    healthCheckService = createHealthCheckService(healthCheckOptions);
    dbIndicator = createIndicator();
    redisIndicator = createIndicator();
    storageIndicator = createIndicator();
    translateIndicator = createIndicator();
    smtpIndicator = createIndicator();
    openAIIndicator = createIndicator();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: DatabaseHealthIndicator, useValue: dbIndicator },
        { provide: RedisHealthIndicator, useValue: redisIndicator },
        { provide: StorageHealthIndicator, useValue: storageIndicator },
        { provide: TranslateHealthIndicator, useValue: translateIndicator },
        { provide: SmtpHealthIndicator, useValue: smtpIndicator },
        { provide: OpenAIHealthIndicator, useValue: openAIIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  };

  beforeEach(async () => {
    await setupController();
  });

  describe('check (all services)', () => {
    it('should check all health indicators', async () => {
      const mockResult: HealthCheckResultDto = {
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
      await setupController({ result: mockResult });

      const result = await controller.check();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should invoke all health indicators when called', async () => {
      await setupController({ invokeChecks: true });

      await controller.check();

      expect(dbIndicator.isHealthy).toHaveBeenCalledWith('database');
      expect(redisIndicator.isHealthy).toHaveBeenCalledWith('redis');
      expect(storageIndicator.isHealthy).toHaveBeenCalledWith('storage');
      expect(translateIndicator.isHealthy).toHaveBeenCalledWith('translate');
      expect(smtpIndicator.isHealthy).toHaveBeenCalledWith('smtp');
      expect(openAIIndicator.isHealthy).toHaveBeenCalledWith('openai');
    });
  });

  describe('checkDatabase', () => {
    it('should check only database health', async () => {
      const mockResult: HealthCheckResultDto = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
      await setupController({ result: mockResult });

      const result = await controller.checkDatabase();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
    });

    it('should invoke database health indicator when called', async () => {
      await setupController({ invokeChecks: true });

      await controller.checkDatabase();

      expect(dbIndicator.isHealthy).toHaveBeenCalledWith('database');
      expect(redisIndicator.isHealthy).not.toHaveBeenCalled();
      expect(storageIndicator.isHealthy).not.toHaveBeenCalled();
      expect(translateIndicator.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('checkRedis', () => {
    it('should check only redis health', async () => {
      const mockResult: HealthCheckResultDto = {
        status: 'ok',
        info: { redis: { status: 'up' } },
        error: {},
        details: { redis: { status: 'up' } },
      };
      await setupController({ result: mockResult });

      const result = await controller.checkRedis();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
    });

    it('should invoke redis health indicator when called', async () => {
      await setupController({ invokeChecks: true });

      await controller.checkRedis();

      expect(redisIndicator.isHealthy).toHaveBeenCalledWith('redis');
      expect(dbIndicator.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('checkStorage', () => {
    it('should check only storage health', async () => {
      const mockResult: HealthCheckResultDto = {
        status: 'ok',
        info: { storage: { status: 'up' } },
        error: {},
        details: { storage: { status: 'up' } },
      };
      await setupController({ result: mockResult });

      const result = await controller.checkStorage();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
    });

    it('should invoke storage health indicator when called', async () => {
      await setupController({ invokeChecks: true });

      await controller.checkStorage();

      expect(storageIndicator.isHealthy).toHaveBeenCalledWith('storage');
      expect(dbIndicator.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('checkTranslate', () => {
    it('should check only translate service health', async () => {
      const mockResult: HealthCheckResultDto = {
        status: 'ok',
        info: { translate: { status: 'up' } },
        error: {},
        details: { translate: { status: 'up' } },
      };
      await setupController({ result: mockResult });

      const result = await controller.checkTranslate();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
    });

    it('should invoke translate health indicator when called', async () => {
      await setupController({ invokeChecks: true });

      await controller.checkTranslate();

      expect(translateIndicator.isHealthy).toHaveBeenCalledWith('translate');
      expect(dbIndicator.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle health check failures for all services', async () => {
      const mockErrorResult: HealthCheckResultDto = {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Connection failed' },
          redis: { status: 'down', message: 'Connection timeout' },
        },
        details: {
          database: { status: 'down' },
          redis: { status: 'down' },
          storage: { status: 'up' },
          translate: { status: 'up' },
        },
      };
      await setupController({ result: mockErrorResult });

      const result = await controller.check();

      expect(result.data?.status).toBe('error');
      expect(result.data?.error).toBeDefined();
      if (result.data?.error) {
        expect(Object.keys(result.data?.error).length).toBeGreaterThan(0);
      }
    });

    it('should handle database health check failure', async () => {
      const mockErrorResult: HealthCheckResultDto = {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Connection refused' },
        },
        details: {
          database: { status: 'down' },
        },
      };
      await setupController({ result: mockErrorResult });

      const result = await controller.checkDatabase();

      expect(result.data?.status).toBe('error');
      expect(result.data?.error?.database).toBeDefined();
    });
  });
});
