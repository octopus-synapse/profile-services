/**
 * True Smoke Tests - Kent Beck Style
 *
 * These tests answer ONE question: "Does the system start?"
 *
 * Characteristics:
 * - FAST: Run in < 5 seconds
 * - ISOLATED: No external dependencies (DB, Redis, etc.)
 * - IMMEDIATE: First line of defense
 *
 * What they verify:
 * - Core modules can be imported
 * - Dependencies are available
 * - Basic TypeScript/decorators work
 *
 * What they DON'T verify:
 * - Business logic
 * - Database operations
 * - External integrations
 */

import { describe, it, expect } from 'bun:test';

describe('Smoke Tests - Application Bootstrap', () => {
  describe('Core Module Imports', () => {
    it('should import AuthModule', async () => {
      const { AuthModule } = await import('../../src/auth/auth.module');
      expect(AuthModule).toBeDefined();
    });

    it('should import UsersModule', async () => {
      const { UsersModule } = await import('../../src/users/users.module');
      expect(UsersModule).toBeDefined();
    });

    it('should import ResumesModule', async () => {
      const { ResumesModule } = await import(
        '../../src/resumes/resumes.module'
      );
      expect(ResumesModule).toBeDefined();
    });

    it('should import HealthModule', async () => {
      const { HealthModule } = await import('../../src/health/health.module');
      expect(HealthModule).toBeDefined();
    });

    it('should import PrismaModule', async () => {
      const { PrismaModule } = await import('../../src/prisma/prisma.module');
      expect(PrismaModule).toBeDefined();
    });

    it('should import OnboardingModule', async () => {
      const { OnboardingModule } = await import(
        '../../src/onboarding/onboarding.module'
      );
      expect(OnboardingModule).toBeDefined();
    });

    // Note: AppModule import is skipped in smoke tests because it transitively
    // loads all modules including external dependencies. Individual module imports
    // above provide sufficient coverage for bootstrap verification.
  });

  describe('Core Services Imports', () => {
    it('should import AuthService', async () => {
      const { AuthService } = await import('../../src/auth/auth.service');
      expect(AuthService).toBeDefined();
    });

    it('should import ResumesService', async () => {
      const { ResumesService } = await import(
        '../../src/resumes/resumes.service'
      );
      expect(ResumesService).toBeDefined();
    });

    it('should import UsersService', async () => {
      const { UsersService } = await import('../../src/users/users.service');
      expect(UsersService).toBeDefined();
    });

    it('should import CacheService', async () => {
      const { CacheService } = await import(
        '../../src/common/cache/cache.service'
      );
      expect(CacheService).toBeDefined();
    });

    it('should import CacheInvalidationService', async () => {
      const { CacheInvalidationService } = await import(
        '../../src/common/cache/services/cache-invalidation.service'
      );
      expect(CacheInvalidationService).toBeDefined();
    });

    it('should import CacheWarmingService', async () => {
      const { CacheWarmingService } = await import(
        '../../src/common/cache/services/cache-warming.service'
      );
      expect(CacheWarmingService).toBeDefined();
    });
  });

  describe('Cache Decorators', () => {
    it('should import @Cacheable decorator', async () => {
      const { Cacheable, buildCacheKey } = await import(
        '../../src/common/cache/decorators/cacheable.decorator'
      );
      expect(Cacheable).toBeDefined();
      expect(buildCacheKey).toBeDefined();
    });

    it('should import @CacheInvalidate decorator', async () => {
      const { CacheInvalidate } = await import(
        '../../src/common/cache/decorators/cache-invalidate.decorator'
      );
      expect(CacheInvalidate).toBeDefined();
    });

    it('should build cache key correctly', async () => {
      const { buildCacheKey } = await import(
        '../../src/common/cache/decorators/cacheable.decorator'
      );
      const key = buildCacheKey('user:{0}:profile', ['user-123']);
      expect(key).toBe('user:user-123:profile');
    });
  });

  describe('Social Module Imports', () => {
    it('should import SocialModule', async () => {
      const { SocialModule } = await import('../../src/social/social.module');
      expect(SocialModule).toBeDefined();
    });

    it('should import FollowService', async () => {
      const { FollowService } = await import(
        '../../src/social/services/follow.service'
      );
      expect(FollowService).toBeDefined();
    });

    it('should import ActivityService', async () => {
      const { ActivityService } = await import(
        '../../src/social/services/activity.service'
      );
      expect(ActivityService).toBeDefined();
    });

    it('should import FollowController', async () => {
      const { FollowController } = await import(
        '../../src/social/controllers/follow.controller'
      );
      expect(FollowController).toBeDefined();
    });

    it('should import ActivityController', async () => {
      const { ActivityController } = await import(
        '../../src/social/controllers/activity.controller'
      );
      expect(ActivityController).toBeDefined();
    });

    it('should export all social features from index', async () => {
      const social = await import('../../src/social');
      expect(social.SocialModule).toBeDefined();
      expect(social.FollowService).toBeDefined();
      expect(social.ActivityService).toBeDefined();
      expect(social.FollowController).toBeDefined();
      expect(social.ActivityController).toBeDefined();
    });
  });

  describe('External Dependencies', () => {
    it('should have @nestjs/common available', async () => {
      const nestCommon = await import('@nestjs/common');
      expect(nestCommon.Injectable).toBeDefined();
      expect(nestCommon.Controller).toBeDefined();
      expect(nestCommon.Module).toBeDefined();
    });

    it('should have @nestjs/testing available', async () => {
      const nestTesting = await import('@nestjs/testing');
      expect(nestTesting.Test).toBeDefined();
    });

    it('should have zod available', async () => {
      const { z } = await import('zod');
      expect(z.string).toBeDefined();
      expect(z.object).toBeDefined();
    });

    it('should have profile-contracts available', async () => {
      const contracts = await import('@octopus-synapse/profile-contracts');
      expect(contracts.EmailSchema).toBeDefined();
      expect(contracts.PasswordSchema).toBeDefined();
    });

    it('should have @prisma/client available', async () => {
      const prisma = await import('@prisma/client');
      expect(prisma.PrismaClient).toBeDefined();
    });
  });

  describe('Runtime Environment', () => {
    it('should have Bun runtime available', () => {
      expect(typeof Bun).toBe('object');
      expect(Bun.version).toBeDefined();
    });

    it('should have NODE_ENV defined', () => {
      expect(process.env.NODE_ENV).toBeDefined();
    });

    it('should be able to resolve paths', async () => {
      const path = await import('path');
      const resolved = path.resolve(__dirname, '../../src');
      expect(resolved).toContain('profile-services');
    });
  });

  describe('TypeScript Features', () => {
    it('should support async/await', async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });

    it('should support decorators (via module import)', async () => {
      // If NestJS modules load, decorators work
      const { Controller, Get } = await import('@nestjs/common');
      expect(typeof Controller).toBe('function');
      expect(typeof Get).toBe('function');
    });
  });
});
