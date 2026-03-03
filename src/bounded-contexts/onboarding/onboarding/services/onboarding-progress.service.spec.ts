/**
 * Onboarding Progress Service Unit Tests
 *
 * These tests verify the facade delegates to use cases correctly.
 * Clean Architecture: Service is a thin facade over use cases.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingProgressService } from './onboarding-progress.service';
import {
  ONBOARDING_PROGRESS_USE_CASES,
  type OnboardingProgressUseCases,
} from './onboarding-progress/ports/onboarding-progress.port';

describe('OnboardingProgressService', () => {
  let service: OnboardingProgressService;
  let mockUseCases: OnboardingProgressUseCases;

  const mockProgressResult = {
    currentStep: 'experience',
    completedSteps: ['welcome', 'personal-info'],
  };

  const mockProgressData = {
    ...mockProgressResult,
    username: 'testuser',
    personalInfo: { fullName: 'John Doe' },
  };

  beforeEach(async () => {
    mockUseCases = {
      saveProgressUseCase: {
        execute: mock().mockResolvedValue(mockProgressResult),
      },
      getProgressUseCase: {
        execute: mock().mockResolvedValue(mockProgressData),
      },
      deleteProgressUseCase: {
        execute: mock().mockResolvedValue(undefined),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingProgressService,
        {
          provide: ONBOARDING_PROGRESS_USE_CASES,
          useValue: mockUseCases,
        },
      ],
    }).compile();

    service = module.get<OnboardingProgressService>(OnboardingProgressService);
  });

  describe('saveProgress', () => {
    it('should delegate to saveProgressUseCase', async () => {
      const inputData = {
        currentStep: 'experience',
        completedSteps: ['welcome'],
        noExperience: false,
        experiences: [],
      };

      const result = await service.saveProgress('user-123', inputData);

      expect(mockUseCases.saveProgressUseCase.execute).toHaveBeenCalledWith(
        'user-123',
        inputData,
      );
      expect(result).toEqual(mockProgressResult);
    });

    it('should propagate errors from use case', async () => {
      const error = new Error('Validation failed');
      mockUseCases.saveProgressUseCase.execute = mock().mockRejectedValue(error);

      await expect(
        service.saveProgress('user-123', {
          currentStep: 'test',
          completedSteps: [],
        }),
      ).rejects.toThrow(error);
    });
  });

  describe('getProgress', () => {
    it('should delegate to getProgressUseCase', async () => {
      const result = await service.getProgress('user-123');

      expect(mockUseCases.getProgressUseCase.execute).toHaveBeenCalledWith(
        'user-123',
      );
      expect(result).toEqual(mockProgressData);
    });

    it('should return progress data from use case', async () => {
      const customProgress = {
        currentStep: 'skills',
        completedSteps: ['welcome', 'personal-info', 'experience'],
        username: 'customuser',
      };
      mockUseCases.getProgressUseCase.execute = mock().mockResolvedValue(customProgress);

      const result = await service.getProgress('user-456');

      expect(result.currentStep).toBe('skills');
      expect(result.username).toBe('customuser');
    });
  });

  describe('deleteProgress', () => {
    it('should delegate to deleteProgressUseCase', async () => {
      await service.deleteProgress('user-123');

      expect(mockUseCases.deleteProgressUseCase.execute).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should complete without error', async () => {
      await expect(service.deleteProgress('user-123')).resolves.toBeUndefined();
    });
  });
});
