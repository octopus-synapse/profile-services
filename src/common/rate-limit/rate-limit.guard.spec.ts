/**
 * Rate Limit Guard Tests
 *
 * Tests for the RateLimitGuard ensuring proper enforcement.
 *
 * Kent Beck: "Test behavior, not implementation"
 */

import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;
  let rateLimitService: RateLimitService;

  const mockRequest = {
    user: null as { id: string } | null,
    path: '/api/v1/test',
    method: 'GET',
    ip: '192.168.1.1',
    socket: { remoteAddress: '192.168.1.1' },
    headers: {},
  };

  const mockResponse = {
    setHeader: mock(),
  };

  const createMockContext = (requestOverrides = {}): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ ...mockRequest, ...requestOverrides }),
        getResponse: () => mockResponse,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    // Reset NODE_ENV for testing the guard behavior
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        Reflector,
        {
          provide: RateLimitService,
          useValue: {
            generateKey: mock(() => 'test-key'),
            consume: mock(() =>
              Promise.resolve({
                remainingPoints: 99,
                msBeforeNext: 60000,
                consumedPoints: 1,
                isBlocked: false,
              }),
            ),
            getHeaders: mock(() => ({
              'X-RateLimit-Limit': 100,
              'X-RateLimit-Remaining': 99,
              'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 60,
            })),
            getContextConfig: mock(() => ({
              points: 100,
              duration: 60,
              keyStrategy: 'ip',
            })),
          },
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get<Reflector>(Reflector);
    rateLimitService = module.get<RateLimitService>(RateLimitService);

    // Restore env after tests setup
    process.env.NODE_ENV = originalEnv;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('when in test environment', () => {
    it('should skip rate limiting', async () => {
      process.env.NODE_ENV = 'test';

      const result = await guard.canActivate(createMockContext());

      expect(result).toBe(true);

      // Restore
      process.env.NODE_ENV = 'development';
    });
  });

  describe('when request is under limit', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should allow request', async () => {
      const result = await guard.canActivate(createMockContext());

      expect(result).toBe(true);
    });

    it('should set rate limit headers', async () => {
      mockResponse.setHeader.mockClear();

      await guard.canActivate(createMockContext());

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        100,
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        99,
      );
    });
  });

  describe('when request exceeds limit', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      (rateLimitService.consume as ReturnType<typeof mock>).mockResolvedValue({
        remainingPoints: 0,
        msBeforeNext: 30000,
        consumedPoints: 100,
        isBlocked: true,
      });
    });

    it('should throw TooManyRequestsException', async () => {
      await expect(guard.canActivate(createMockContext())).rejects.toThrow(
        HttpException,
      );
    });

    it('should include retry-after in error', async () => {
      try {
        await guard.canActivate(createMockContext());
      } catch (error) {
        if (error instanceof HttpException) {
          expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
          const response = error.getResponse() as Record<string, unknown>;
          expect(response.retryAfter).toBeDefined();
        }
      }
    });
  });

  describe('key generation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should use IP for unauthenticated requests', async () => {
      await guard.canActivate(createMockContext());

      expect(rateLimitService.generateKey).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '192.168.1.1',
        }),
      );
    });

    it('should use user ID for authenticated requests', async () => {
      await guard.canActivate(
        createMockContext({
          user: { id: 'user-123' },
        }),
      );

      expect(rateLimitService.generateKey).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
        }),
      );
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      await guard.canActivate(
        createMockContext({
          headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
        }),
      );

      expect(rateLimitService.generateKey).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '10.0.0.1',
        }),
      );
    });
  });

  describe('context detection', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should detect auth endpoints', async () => {
      await guard.canActivate(
        createMockContext({
          path: '/api/v1/auth/login',
        }),
      );

      expect(rateLimitService.getContextConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthEndpoint: true,
        }),
      );
    });

    it('should detect expensive operations', async () => {
      await guard.canActivate(
        createMockContext({
          path: '/api/v1/export/pdf',
        }),
      );

      expect(rateLimitService.getContextConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          isExpensiveOperation: true,
        }),
      );
    });
  });

  describe('custom rate limit decorator', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should use custom limits when specified via decorator', async () => {
      spyOn(reflector, 'get').mockReturnValue({
        points: 5,
        duration: 60,
      });

      await guard.canActivate(createMockContext());

      expect(rateLimitService.consume).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          points: 5,
        }),
      );
    });
  });
});
