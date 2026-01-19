/**
 * Onboarding Progress Service Unit Tests
 *
 * These tests verify the ACTUAL service behavior, not fake helper functions.
 * Uncle Bob: "Every test should tell a story of real system behavior."
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DomainValidationError,
  UsernameConflictError,
} from '@octopus-synapse/profile-contracts';
import { OnboardingProgressService } from './onboarding-progress.service';
import { OnboardingRepository } from '../repositories/onboarding.repository';
import { AppLoggerService } from '../../common/logger/logger.service';

describe('OnboardingProgressService', () => {
  let service: OnboardingProgressService;
  let repository: OnboardingRepository;

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
    const mockFindOnboardingProgress = mock();
    const mockUpsertOnboardingProgress = mock();
    const mockDeleteOnboardingProgress = mock();
    const mockFindUserByUsername = mock();

    repository = {
      findOnboardingProgress: mockFindOnboardingProgress,
      upsertOnboardingProgress: mockUpsertOnboardingProgress,
      deleteOnboardingProgress: mockDeleteOnboardingProgress,
      findUserByUsername: mockFindUserByUsername,
    } as OnboardingRepository;

    mockFindOnboardingProgress.mockResolvedValue(null);
    mockUpsertOnboardingProgress.mockResolvedValue(mockProgress);
    mockDeleteOnboardingProgress.mockResolvedValue({ count: 1 });
    mockFindUserByUsername.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingProgressService,
        { provide: OnboardingRepository, useValue: repository },
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
        ).rejects.toThrow(DomainValidationError);
      });

      it('should reject noEducation=true with non-empty education', async () => {
        await expect(
          service.saveProgress('user-123', {
            currentStep: 'education',
            completedSteps: ['welcome'],
            noEducation: true,
            education: [{ institution: 'MIT' }] as any,
          }),
        ).rejects.toThrow(DomainValidationError);
      });

      it('should reject noSkills=true with non-empty skills', async () => {
        await expect(
          service.saveProgress('user-123', {
            currentStep: 'skills',
            completedSteps: ['welcome'],
            noSkills: true,
            skills: [{ name: 'TypeScript' }] as any,
          }),
        ).rejects.toThrow(DomainValidationError);
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
        (
          repository.findUserByUsername as ReturnType<typeof mock>
        ).mockResolvedValue({ id: 'other-user' });

        await expect(
          service.saveProgress('user-123', {
            currentStep: 'username',
            completedSteps: ['welcome'],
            username: 'takenuser',
          }),
        ).rejects.toThrow(UsernameConflictError);
      });

      it('should accept if username belongs to same user', async () => {
        (
          repository.findUserByUsername as ReturnType<typeof mock>
        ).mockResolvedValue({ id: 'user-123' });

        const result = await service.saveProgress('user-123', {
          currentStep: 'username',
          completedSteps: ['welcome'],
          username: 'myusername',
        });

        expect(result.success).toBe(true);
      });

      it('should accept if username is available', async () => {
        (
          repository.findUserByUsername as ReturnType<typeof mock>
        ).mockResolvedValue(null);

        const result = await service.saveProgress('user-123', {
          currentStep: 'username',
          completedSteps: ['welcome'],
          username: 'newusername',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Successful Save', () => {
      it('should call repository upsert with correct data', async () => {
        await service.saveProgress('user-123', {
          currentStep: 'personal-info',
          completedSteps: ['welcome'],
          personalInfo: { fullName: 'John' } as any,
        });

        expect(repository.upsertOnboardingProgress).toHaveBeenCalled();
      });

      it('should return success with current step', async () => {
        (
          repository.upsertOnboardingProgress as ReturnType<typeof mock>
        ).mockResolvedValue({
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
        (
          repository.findOnboardingProgress as ReturnType<typeof mock>
        ).mockResolvedValue(null);

        const result = await service.getProgress('user-123');

        expect(result.currentStep).toBe('welcome');
        expect(result.completedSteps).toEqual([]);
      });

      it('should return saved progress if fresh', async () => {
        const freshProgress = {
          ...mockProgress,
          updatedAt: new Date(),
        };
        (
          repository.findOnboardingProgress as ReturnType<typeof mock>
        ).mockResolvedValue(freshProgress);

        const result = await service.getProgress('user-123');

        expect(result.currentStep).toBe('experience');
        expect(result.completedSteps.includes('welcome')).toBe(true);
      });

      it('should return initial progress and delete if expired (>36h)', async () => {
        const expiredProgress = {
          ...mockProgress,
          updatedAt: new Date(Date.now() - 40 * 60 * 60 * 1000),
        };
        (
          repository.findOnboardingProgress as ReturnType<typeof mock>
        ).mockResolvedValue(expiredProgress);

        const result = await service.getProgress('user-123');

        expect(result.currentStep).toBe('welcome');
        expect(result.completedSteps).toEqual([]);
        expect(repository.deleteOnboardingProgress).toHaveBeenCalledWith(
          'user-123',
        );
      });

      it('should keep progress at exactly 35 hours', async () => {
        const almostExpired = {
          ...mockProgress,
          updatedAt: new Date(Date.now() - 35 * 60 * 60 * 1000),
        };
        (
          repository.findOnboardingProgress as ReturnType<typeof mock>
        ).mockResolvedValue(almostExpired);

        const result = await service.getProgress('user-123');

        expect(result.currentStep).toBe('experience');
      });
    });
  });

  describe('deleteProgress', () => {
    it('should delete progress for user', async () => {
      await service.deleteProgress('user-123');

      expect(repository.deleteOnboardingProgress).toHaveBeenCalledWith(
        'user-123',
      );
    });
  });
});
