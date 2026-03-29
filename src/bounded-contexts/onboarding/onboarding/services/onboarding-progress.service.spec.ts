/**
 * Onboarding Progress Service Unit Tests
 *
 * These tests verify the facade delegates to use cases correctly.
 * Clean Architecture: Service is a thin facade over use cases.
 *
 * Pure Bun tests with typed stubs.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { OnboardingProgress } from '../schemas/onboarding-progress.schema';
import type {
  OnboardingProgressData,
  OnboardingProgressUseCases,
  SaveProgressResult,
} from './onboarding-progress/ports/onboarding-progress.port';
import { OnboardingProgressService } from './onboarding-progress.service';

// ============================================================================
// Initial progress (same as use case)
// ============================================================================

const INITIAL_PROGRESS: OnboardingProgressData = {
  currentStep: 'welcome',
  completedSteps: [],
  username: null,
  personalInfo: null,
  professionalProfile: null,
  sections: [],
  templateSelection: null,
};

// ============================================================================
// Stub Use Cases
// ============================================================================

class StubSaveProgressUseCase {
  calls: Array<{ userId: string; data: OnboardingProgress }> = [];
  private result: SaveProgressResult = {
    currentStep: 'experience',
    completedSteps: ['welcome', 'personal-info'],
  };
  private errorToThrow: Error | null = null;

  setResult(result: SaveProgressResult): void {
    this.result = result;
  }

  setError(error: Error): void {
    this.errorToThrow = error;
  }

  async execute(userId: string, data: OnboardingProgress): Promise<SaveProgressResult> {
    this.calls.push({ userId, data });
    if (this.errorToThrow) {
      const error = this.errorToThrow;
      this.errorToThrow = null;
      throw error;
    }
    return this.result;
  }
}

class StubGetProgressUseCase {
  calls: Array<{ userId: string }> = [];
  private result: OnboardingProgressData = INITIAL_PROGRESS;

  setResult(result: OnboardingProgressData): void {
    this.result = result;
  }

  async execute(userId: string): Promise<OnboardingProgressData> {
    this.calls.push({ userId });
    return this.result;
  }
}

class StubDeleteProgressUseCase {
  calls: Array<{ userId: string }> = [];

  async execute(userId: string): Promise<void> {
    this.calls.push({ userId });
  }
}

describe('OnboardingProgressService', () => {
  let service: OnboardingProgressService;
  let stubSaveUseCase: StubSaveProgressUseCase;
  let stubGetUseCase: StubGetProgressUseCase;
  let stubDeleteUseCase: StubDeleteProgressUseCase;

  beforeEach(() => {
    stubSaveUseCase = new StubSaveProgressUseCase();
    stubGetUseCase = new StubGetProgressUseCase();
    stubDeleteUseCase = new StubDeleteProgressUseCase();

    const useCases: OnboardingProgressUseCases = {
      saveProgressUseCase: stubSaveUseCase,
      getProgressUseCase: stubGetUseCase,
      deleteProgressUseCase: stubDeleteUseCase,
    };

    service = new OnboardingProgressService(useCases);
  });

  describe('saveProgress', () => {
    it('should delegate to saveProgressUseCase', async () => {
      const inputData: OnboardingProgress = {
        currentStep: 'experience',
        completedSteps: ['welcome'],
      };

      const result = await service.saveProgress('user-123', inputData);

      expect(stubSaveUseCase.calls[0]).toEqual({
        userId: 'user-123',
        data: inputData,
      });
      expect(result.currentStep).toBe('experience');
    });

    it('should propagate errors from use case', async () => {
      const error = new Error('Validation failed');
      stubSaveUseCase.setError(error);

      const inputData: OnboardingProgress = {
        currentStep: 'welcome',
        completedSteps: [],
      };

      await expect(service.saveProgress('user-123', inputData)).rejects.toThrow(error);
    });
  });

  describe('getProgress', () => {
    it('should delegate to getProgressUseCase', async () => {
      const progressData: OnboardingProgressData = {
        currentStep: 'skills',
        completedSteps: ['welcome', 'personal-info', 'experience'],
        username: 'testuser',
        personalInfo: null,
        professionalProfile: null,
        sections: [],
        templateSelection: null,
      };
      stubGetUseCase.setResult(progressData);

      const result = await service.getProgress('user-123');

      expect(stubGetUseCase.calls[0]).toEqual({ userId: 'user-123' });
      expect(result).toEqual(progressData);
    });

    it('should return initial progress when no progress exists', async () => {
      const result = await service.getProgress('user-123');

      expect(result).toEqual(INITIAL_PROGRESS);
    });
  });

  describe('deleteProgress', () => {
    it('should delegate to deleteProgressUseCase', async () => {
      await service.deleteProgress('user-123');

      expect(stubDeleteUseCase.calls[0]).toEqual({ userId: 'user-123' });
    });
  });
});
