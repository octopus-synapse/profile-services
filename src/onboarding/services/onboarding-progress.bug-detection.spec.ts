/**
 * Onboarding Progress Bug Detection Tests
 *
 * These tests are written from SPECIFICATIONS, not from implementation.
 * Uncle Bob: "If the test can't fail, it's not a test."
 *
 * EXPECTED: Some tests will FAIL - that's the point. They expose bugs.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OnboardingProgressService } from './onboarding-progress.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';

describe('OnboardingProgressService - Bug Detection', () => {
  let service: OnboardingProgressService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      onboardingProgress: {
        findUnique: mock(),
        upsert: mock(),
        deleteMany: mock(),
      },
      user: {
        findUnique: mock().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingProgressService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: AppLoggerService,
          useValue: { debug: mock(), log: mock() },
        },
      ],
    }).compile();

    service = module.get<OnboardingProgressService>(OnboardingProgressService);
  });

  /**
   * BUG #5: noExperience/noEducation/noSkills validation
   *
   * Business Rule: "If the flag is true, the corresponding array MUST be empty.
   *                 Data is not ignored - it is FORBIDDEN."
   *
   * Current behavior: No validation - accepts any data
   * Expected behavior: Throw BadRequestException if flag=true but array has data
   */
  describe('BUG #5: Flag + non-empty array validation', () => {
    it('should REJECT noExperience=true with non-empty experiences array', async () => {
      mockPrisma.onboardingProgress.upsert.mockResolvedValue({});

      await expect(
        service.saveProgress('user-123', {
          currentStep: 'experiences',
          completedSteps: ['welcome'],
          noExperience: true,
          experiences: [
            { company: 'Acme', position: 'Dev', startDate: '2020-01-01' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT noEducation=true with non-empty education array', async () => {
      await expect(
        service.saveProgress('user-123', {
          currentStep: 'education',
          completedSteps: ['welcome'],
          noEducation: true,
          education: [
            { institution: 'MIT', degree: 'BS', startDate: '2016-01-01' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT noSkills=true with non-empty skills array', async () => {
      await expect(
        service.saveProgress('user-123', {
          currentStep: 'skills',
          completedSteps: ['welcome'],
          noSkills: true,
          skills: [{ name: 'JavaScript' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include "cannot" or "forbidden" in error message', async () => {
      try {
        await service.saveProgress('user-123', {
          currentStep: 'experiences',
          completedSteps: ['welcome'],
          noExperience: true,
          experiences: [{ company: 'X' }],
        } as any);
        fail('Should have thrown');
      } catch (error) {
        const msg = (error as Error).message.toLowerCase();
        expect(msg).toMatch(/cannot|forbidden|empty|invalid/);
      }
    });

    it('should ACCEPT noExperience=true with empty experiences array', async () => {
      mockPrisma.onboardingProgress.upsert.mockResolvedValue({
        currentStep: 'experiences',
        completedSteps: ['welcome'],
      });

      const result = await service.saveProgress('user-123', {
        currentStep: 'experiences',
        completedSteps: ['welcome'],
        noExperience: true,
        experiences: [],
      });

      expect(result.success).toBe(true);
    });
  });

  /**
   * BUG #6: Onboarding progress expiration (36 hours)
   *
   * Business Rule: "Progress is maintained for 36 hours.
   *                 After this period: progress is discarded, user returns to initial step."
   *
   * Current behavior: No expiration check
   * Expected behavior: Return initial progress if expired
   */
  describe('BUG #6: Progress expiration after 36 hours', () => {
    it('should return INITIAL progress if existing progress is older than 36 hours', async () => {
      const fortyHoursAgo = new Date(Date.now() - 40 * 60 * 60 * 1000);

      mockPrisma.onboardingProgress.findUnique.mockResolvedValue({
        userId: 'user-123',
        currentStep: 'skills',
        completedSteps: ['welcome', 'personal-info', 'experience'],
        createdAt: fortyHoursAgo,
        updatedAt: fortyHoursAgo,
      });

      const result = await service.getProgress('user-123');

      // Should reset to initial state, not return the stale data
      expect(result.currentStep).toBe('welcome');
      expect(result.completedSteps).toEqual([]);
    });

    it('should DELETE expired progress automatically', async () => {
      const fortyHoursAgo = new Date(Date.now() - 40 * 60 * 60 * 1000);

      mockPrisma.onboardingProgress.findUnique.mockResolvedValue({
        userId: 'user-123',
        currentStep: 'skills',
        updatedAt: fortyHoursAgo,
      });

      await service.getProgress('user-123');

      // Should have deleted the expired progress
      expect(mockPrisma.onboardingProgress.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should KEEP progress if less than 36 hours old', async () => {
      const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);

      mockPrisma.onboardingProgress.findUnique.mockResolvedValue({
        userId: 'user-123',
        currentStep: 'skills',
        completedSteps: ['welcome', 'personal-info'],
        updatedAt: tenHoursAgo,
        personalInfo: { fullName: 'John' },
        professionalProfile: null,
        experiences: [],
        noExperience: false,
        education: [],
        noEducation: false,
        skills: [],
        noSkills: false,
        languages: [],
        templateSelection: null,
        username: null,
      });

      const result = await service.getProgress('user-123');

      expect(result.currentStep).toBe('skills');
      expect(result.completedSteps).toContain('welcome');
    });

    it('should check expiration at exactly 36 hours (boundary)', async () => {
      const exactly36HoursAgo = new Date(Date.now() - 36 * 60 * 60 * 1000);

      mockPrisma.onboardingProgress.findUnique.mockResolvedValue({
        userId: 'user-123',
        currentStep: 'education',
        completedSteps: ['welcome'],
        updatedAt: exactly36HoursAgo,
      });

      const result = await service.getProgress('user-123');

      // At exactly 36 hours, should expire
      expect(result.currentStep).toBe('welcome');
    });
  });

  /**
   * BUG: Sequential step validation
   *
   * Business Rule: "Steps must be completed in sequential order.
   *                 Skipping steps is not allowed."
   *
   * Current behavior: No step order validation
   * Expected behavior: Reject if trying to go to step N without completing N-1
   */
  describe('Sequential step validation', () => {
    // Valid step order for documentation purposes
    const _STEP_ORDER = [
      'welcome',
      'personal-info',
      'username',
      'professional-profile',
      'experience',
      'education',
      'skills',
      'languages',
      'template',
      'review',
    ];

    it('should REJECT skipping from welcome to skills', async () => {
      await expect(
        service.saveProgress('user-123', {
          currentStep: 'skills',
          completedSteps: ['welcome'], // Missing personal-info, professional-profile, etc.
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT going to education without completing experience step', async () => {
      await expect(
        service.saveProgress('user-123', {
          currentStep: 'education',
          completedSteps: ['welcome', 'personal-info', 'professional-profile'],
          // Missing 'experience' in completedSteps
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ACCEPT valid sequential progress', async () => {
      mockPrisma.onboardingProgress.upsert.mockResolvedValue({
        currentStep: 'professional-profile',
        completedSteps: ['welcome', 'personal-info', 'username'],
      });

      const result = await service.saveProgress('user-123', {
        currentStep: 'professional-profile',
        completedSteps: ['welcome', 'personal-info', 'username'],
      });

      expect(result.success).toBe(true);
    });
  });
});
