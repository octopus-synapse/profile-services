/**
 * Save Progress Use Case Tests
 *
 * Tests business logic for saving onboarding progress.
 * Uses In-Memory Repository - Clean Architecture pattern.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { OnboardingProgress } from '@/shared-kernel';
import { ConflictException, ValidationException } from '@/shared-kernel';
import type {
  OnboardingProgressData,
  OnboardingProgressRepositoryPort,
  ProgressRecord,
  SaveProgressResult,
} from '../ports/onboarding-progress.port';
import { SaveProgressUseCase } from './save-progress.use-case';

// ============================================================================
// In-Memory Repository Implementation
// ============================================================================

class InMemoryOnboardingProgressRepository implements OnboardingProgressRepositoryPort {
  private progressMap: Map<string, ProgressRecord> = new Map();
  private usersMap: Map<string, { id: string; username: string }> = new Map();

  // Test helpers
  addUser(username: string, userId: string): void {
    this.usersMap.set(username.toLowerCase(), { id: userId, username });
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
    this.progressMap.delete(userId);
  }

  async deleteProgressWithTx(_tx: unknown, userId: string): Promise<void> {
    this.progressMap.delete(userId);
  }

  async findUserByUsername(username: string): Promise<{ id: string } | null> {
    const user = this.usersMap.get(username.toLowerCase());
    return user ? { id: user.id } : null;
  }
}

describe('SaveProgressUseCase', () => {
  let useCase: SaveProgressUseCase;
  let repository: InMemoryOnboardingProgressRepository;

  beforeEach(() => {
    repository = new InMemoryOnboardingProgressRepository();
    useCase = new SaveProgressUseCase(repository);
  });

  it('saves progress and returns result (not envelope)', async () => {
    const data: OnboardingProgress = {
      currentStep: 'personal-info',
      completedSteps: ['welcome'],
      username: 'johndoe',
    };

    const result = await useCase.execute('user-1', data);

    expect(result).toEqual({
      currentStep: 'personal-info',
      completedSteps: ['welcome'],
    });
    // CRITICAL: NO envelope with success
    expect(result).not.toHaveProperty('success');
  });

  it('validates username uniqueness', async () => {
    repository.addUser('taken_username', 'other-user');

    const data: OnboardingProgress = {
      currentStep: 'personal-info',
      completedSteps: ['welcome'],
      username: 'taken_username',
    };

    await expect(useCase.execute('user-1', data)).rejects.toThrow(ConflictException);
  });

  it('allows same user to keep their username', async () => {
    repository.addUser('my_username', 'user-1');

    const data: OnboardingProgress = {
      currentStep: 'personal-info',
      completedSteps: ['welcome'],
      username: 'my_username',
    };

    const result = await useCase.execute('user-1', data);

    expect(result.currentStep).toBe('personal-info');
  });

  it('allows new username when not taken', async () => {
    const data: OnboardingProgress = {
      currentStep: 'personal-info',
      completedSteps: ['welcome'],
      username: 'available_username',
    };

    const result = await useCase.execute('user-1', data);

    expect(result.currentStep).toBe('personal-info');
  });

  describe('Section validation', () => {
    it('rejects sections with noData=true but non-empty items', async () => {
      const data: OnboardingProgress = {
        currentStep: 'experience',
        completedSteps: ['welcome'],
        sections: [
          {
            sectionTypeKey: 'work_experience_v1',
            noData: true,
            items: [{ content: { company: 'Acme Inc' } }],
          },
        ],
      };

      await expect(useCase.execute('user-1', data)).rejects.toThrow(ValidationException);
    });

    it('accepts sections with noData=true and empty items', async () => {
      const data: OnboardingProgress = {
        currentStep: 'experience',
        completedSteps: ['welcome'],
        sections: [
          {
            sectionTypeKey: 'work_experience_v1',
            noData: true,
            items: [],
          },
        ],
      };

      const result = await useCase.execute('user-1', data);

      expect(result.currentStep).toBe('experience');
    });

    it('accepts sections with noData=false and items', async () => {
      const data: OnboardingProgress = {
        currentStep: 'experience',
        completedSteps: ['welcome'],
        sections: [
          {
            sectionTypeKey: 'work_experience_v1',
            noData: false,
            items: [{ content: { company: 'Acme Inc' } }],
          },
        ],
      };

      const result = await useCase.execute('user-1', data);

      expect(result.currentStep).toBe('experience');
    });
  });
});
