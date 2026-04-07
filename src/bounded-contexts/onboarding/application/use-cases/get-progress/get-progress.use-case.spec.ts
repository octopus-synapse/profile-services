/**
 * Get Progress Use Case Tests
 *
 * Tests business logic for retrieving onboarding progress.
 * Uses In-Memory Repository - Clean Architecture pattern.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type {
  OnboardingProgressData,
  OnboardingProgressRepositoryPort,
  ProgressRecord,
  SaveProgressResult,
} from '../../../domain/ports/onboarding-progress.port';
import { GetProgressUseCase, INITIAL_PROGRESS } from './get-progress.use-case';

// ============================================================================
// In-Memory Repository Implementation
// ============================================================================

class InMemoryOnboardingProgressRepository implements OnboardingProgressRepositoryPort {
  private progressMap: Map<string, ProgressRecord> = new Map();
  deleteProgressCalledWith: string | null = null;

  // Test helpers
  setProgress(userId: string, progress: Omit<ProgressRecord, 'userId'>): void {
    this.progressMap.set(userId, { ...progress, userId });
  }

  async findProgressByUserId(userId: string): Promise<ProgressRecord | null> {
    return this.progressMap.get(userId) ?? null;
  }

  async upsertProgress(userId: string, data: OnboardingProgressData): Promise<SaveProgressResult> {
    const existing = this.progressMap.get(userId);
    const record: ProgressRecord = {
      userId,
      currentStep: data.currentStep ?? existing?.currentStep ?? 'welcome',
      completedSteps: data.completedSteps ?? existing?.completedSteps ?? [],
      username: data.username ?? existing?.username ?? null,
      personalInfo: data.personalInfo ?? existing?.personalInfo ?? null,
      professionalProfile: data.professionalProfile ?? existing?.professionalProfile ?? null,
      sections: data.sections ?? existing?.sections ?? null,
      templateSelection: data.templateSelection ?? existing?.templateSelection ?? null,
      updatedAt: new Date(),
    };
    this.progressMap.set(userId, record);
    return {
      currentStep: record.currentStep,
      completedSteps: record.completedSteps,
    };
  }

  async deleteProgress(userId: string): Promise<void> {
    this.deleteProgressCalledWith = userId;
    this.progressMap.delete(userId);
  }

  async deleteProgressWithTx(_tx: unknown, userId: string): Promise<void> {
    await this.deleteProgress(userId);
  }

  async findUserByUsername(_username: string): Promise<{ id: string } | null> {
    return null;
  }
}

describe('GetProgressUseCase', () => {
  let useCase: GetProgressUseCase;
  let repository: InMemoryOnboardingProgressRepository;

  const mockProgress: Omit<ProgressRecord, 'userId'> = {
    currentStep: 'personal-info',
    completedSteps: ['welcome'],
    username: 'johndoe',
    personalInfo: { fullName: 'John Doe' },
    professionalProfile: null,
    sections: null,
    templateSelection: null,
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new InMemoryOnboardingProgressRepository();
    useCase = new GetProgressUseCase(repository);
  });

  it('returns progress data for user', async () => {
    repository.setProgress('user-1', mockProgress);

    const result = await useCase.execute('user-1');

    expect(result.currentStep).toBe('personal-info');
    expect(result.completedSteps).toEqual(['welcome']);
    expect(result.username).toBe('johndoe');
  });

  it('returns initial progress when no progress exists', async () => {
    const result = await useCase.execute('user-1');

    expect(result).toEqual(INITIAL_PROGRESS);
  });

  it('deletes and returns initial progress when expired', async () => {
    const expiredDate = new Date(Date.now() - 37 * 60 * 60 * 1000); // 37 hours ago
    repository.setProgress('user-1', {
      ...mockProgress,
      updatedAt: expiredDate,
    });

    const result = await useCase.execute('user-1');

    expect(repository.deleteProgressCalledWith).toBe('user-1');
    expect(result).toEqual(INITIAL_PROGRESS);
  });
});
