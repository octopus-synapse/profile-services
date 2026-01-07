/**
 * Onboarding Progress Service Unit Tests
 *
 * These tests verify the ACTUAL service behavior, not fake helper functions.
 * Uncle Bob: "Every test should tell a story of real system behavior."
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { OnboardingProgressService } from './onboarding-progress.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';

describe('OnboardingProgressService', () => {
  let service: OnboardingProgressService;
  let mockPrisma: any;

  const mockProgress = {
    userId: 'user-123',
    currentStep: 'experience',
    completedSteps: ['welcome', 'personal-info'],
    username: 'testuser',
    personalInfo: { fullName: 'John Doe' },
    professionalProfile: { headline: 'Developer' },
    experiences: [],
    noExperience: false,
    education: [],
    noEducation: false,
    skills: [],
    noSkills: false,
    languages: [],
    templateSelection: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      onboardingProgress: {
        findUnique: mock().mockResolvedValue(null),
        upsert: mock().mockResolvedValue(mockProgress),
        deleteMany: mock().mockResolvedValue({ count: 1 }),
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

  describe('saveProgress', () => {
    describe('Flag + Array Validation', () => {
      it('should reject noExperience=true with non-empty experiences', async () => {
        await expect(
          service.saveProgress('user-123', {
            currentStep: 'experience',
            completedSteps: ['welcome'],
            noExperience: true,
            experiences: [{ company: 'Acme', position: 'Dev' }] as any,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject noEducation=true with non-empty education', async () => {
        await expect(
          service.saveProgress('user-123', {
            currentStep: 'education',
            completedSteps: ['welcome'],
            noEducation: true,
            education: [{ institution: 'MIT' }] as any,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject noSkills=true with non-empty skills', async () => {
        await expect(
          service.saveProgress('user-123', {
            currentStep: 'skills',
            completedSteps: ['welcome'],
            noSkills: true,
            skills: [{ name: 'TypeScript' }] as any,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should accept noExperience=true with empty experiences', async () => {
        const result = await service.saveProgress('user-123', {
          currentStep: 'experience',
          completedSteps: ['welcome'],
          noExperience: true,
          experiences: [],
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Username Validation', () => {
      it('should reject if username is taken by another user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'other-user' });

        await expect(
          service.saveProgress('user-123', {
            currentStep: 'username',
            completedSteps: ['welcome'],
            username: 'takenuser',
          }),
        ).rejects.toThrow(ConflictException);
      });

      it('should accept if username belongs to same user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });

        const result = await service.saveProgress('user-123', {
          currentStep: 'username',
          completedSteps: ['welcome'],
          username: 'myusername',
        });

        expect(result.success).toBe(true);
      });

      it('should accept if username is available', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const result = await service.saveProgress('user-123', {
          currentStep: 'username',
          completedSteps: ['welcome'],
          username: 'newusername',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Successful Save', () => {
      it('should call prisma upsert with correct data', async () => {
        await service.saveProgress('user-123', {
          currentStep: 'personal-info',
          completedSteps: ['welcome'],
          personalInfo: { fullName: 'John' } as any,
        });

        expect(mockPrisma.onboardingProgress.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'user-123' },
          }),
        );
      });

      it('should return success with current step', async () => {
        mockPrisma.onboardingProgress.upsert.mockResolvedValue({
          currentStep: 'skills',
          completedSteps: ['welcome', 'personal-info'],
        });

        const result = await service.saveProgress('user-123', {
          currentStep: 'skills',
          completedSteps: ['welcome', 'personal-info'],
        });

        expect(result.success).toBe(true);
        expect(result.currentStep).toBe('skills');
      });
    });
  });

  describe('getProgress', () => {
    describe('Expiration (36 hours)', () => {
      it('should return initial progress if no saved progress', async () => {
        mockPrisma.onboardingProgress.findUnique.mockResolvedValue(null);

        const result = await service.getProgress('user-123');

        expect(result.currentStep).toBe('welcome');
        expect(result.completedSteps).toEqual([]);
      });

      it('should return saved progress if fresh', async () => {
        const freshProgress = {
          ...mockProgress,
          updatedAt: new Date(), // Just updated
        };
        mockPrisma.onboardingProgress.findUnique.mockResolvedValue(
          freshProgress,
        );

        const result = await service.getProgress('user-123');

        expect(result.currentStep).toBe('experience');
        expect(result.completedSteps.includes('welcome')).toBe(true);
      });

      it('should return initial progress and delete if expired (>36h)', async () => {
        const expiredProgress = {
          ...mockProgress,
          updatedAt: new Date(Date.now() - 40 * 60 * 60 * 1000), // 40 hours ago
        };
        mockPrisma.onboardingProgress.findUnique.mockResolvedValue(
          expiredProgress,
        );

        const result = await service.getProgress('user-123');

        expect(result.currentStep).toBe('welcome');
        expect(result.completedSteps).toEqual([]);
        expect(mockPrisma.onboardingProgress.deleteMany).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
        });
      });

      it('should keep progress at exactly 35 hours', async () => {
        const almostExpired = {
          ...mockProgress,
          updatedAt: new Date(Date.now() - 35 * 60 * 60 * 1000), // 35 hours ago
        };
        mockPrisma.onboardingProgress.findUnique.mockResolvedValue(
          almostExpired,
        );

        const result = await service.getProgress('user-123');

        expect(result.currentStep).toBe('experience');
        expect(mockPrisma.onboardingProgress.deleteMany.mock.calls.length).toBe(0);
      });
    });
  });

  describe('deleteProgress', () => {
    it('should delete progress for user', async () => {
      await service.deleteProgress('user-123');

      expect(mockPrisma.onboardingProgress.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });
});
