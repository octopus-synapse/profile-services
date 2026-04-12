/**
 * Onboarding Testing Module
 *
 * In-memory implementations for testing onboarding functionality.
 * Following clean architecture - no Prisma, no mocks.
 */

import type {
  OnboardingStatus,
  TransactionClient,
  UserForOnboarding,
} from '../domain/ports/onboarding.port';
import { OnboardingRepositoryPort } from '../domain/ports/onboarding.port';
import type {
  OnboardingProgressData,
  ProgressRecord,
  SectionProgressData,
} from '../domain/ports/onboarding-progress.port';
import { OnboardingProgressRepositoryPort } from '../domain/ports/onboarding-progress.port';
import type { OnboardingData } from '../domain/schemas/onboarding-data.schema';

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingUserData {
  id: string;
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: Date | null;
  username: string | null;
  displayName: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
}

export interface OnboardingProgressRecord {
  userId: string;
  currentStep: string;
  completedSteps: string[];
  username: string | null;
  personalInfo: unknown;
  professionalProfile: unknown;
  sections: SectionProgressData[] | null;
  templateSelection: unknown;
  updatedAt: Date;
}

// ============================================================================
// IN-MEMORY ONBOARDING REPOSITORY
// ============================================================================

export class InMemoryOnboardingRepository extends OnboardingRepositoryPort {
  private users = new Map<string, OnboardingUserData>();

  async findUserById(userId: string): Promise<UserForOnboarding | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    return {
      id: user.id,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };
  }

  async getOnboardingStatus(userId: string): Promise<OnboardingStatus | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    return {
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      onboardingCompletedAt: user.onboardingCompletedAt,
    };
  }

  async markOnboardingComplete(
    _tx: TransactionClient,
    userId: string,
    data: OnboardingData,
  ): Promise<void> {
    const user = this.users.get(userId) ?? {
      id: userId,
      hasCompletedOnboarding: false,
      onboardingCompletedAt: null,
      username: null,
      displayName: null,
      phone: null,
      location: null,
      bio: null,
      linkedin: null,
      github: null,
      website: null,
    };

    this.users.set(userId, {
      ...user,
      hasCompletedOnboarding: true,
      onboardingCompletedAt: new Date(),
      username: data.username,
      displayName: data.personalInfo.fullName,
      phone: data.personalInfo.phone ?? null,
      location: data.personalInfo.location ?? null,
      bio: data.professionalProfile.summary,
      linkedin: data.professionalProfile.linkedin ?? null,
      github: data.professionalProfile.github ?? null,
      website: data.professionalProfile.website ?? null,
    });
  }

  async executeInTransaction<T>(
    fn: (tx: TransactionClient) => Promise<T>,
    _options?: { timeout?: number },
  ): Promise<T> {
    // For in-memory implementation, we just execute the function
    // Transaction is a no-op since everything is synchronous
    const tx = {} as TransactionClient;
    return fn(tx);
  }

  // Test helpers
  seedUser(user: OnboardingUserData): void {
    this.users.set(user.id, user);
  }

  getUser(userId: string): OnboardingUserData | undefined {
    return this.users.get(userId);
  }

  getAllUsers(): OnboardingUserData[] {
    return Array.from(this.users.values());
  }

  clear(): void {
    this.users.clear();
  }
}

// ============================================================================
// IN-MEMORY ONBOARDING PROGRESS REPOSITORY
// ============================================================================

export class InMemoryOnboardingProgressRepository extends OnboardingProgressRepositoryPort {
  private progressRecords = new Map<string, OnboardingProgressRecord>();
  private users = new Map<string, { id: string }>();

  async findProgressByUserId(userId: string): Promise<ProgressRecord | null> {
    const record = this.progressRecords.get(userId);
    if (!record) return null;

    return {
      userId: record.userId,
      currentStep: record.currentStep,
      completedSteps: record.completedSteps,
      username: record.username,
      personalInfo: record.personalInfo,
      professionalProfile: record.professionalProfile,
      sections: record.sections,
      templateSelection: record.templateSelection,
      updatedAt: record.updatedAt,
    };
  }

  async upsertProgress(
    userId: string,
    data: OnboardingProgressData,
  ): Promise<{ currentStep: string; completedSteps: string[] }> {
    const record: OnboardingProgressRecord = {
      userId,
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      username: data.username ?? null,
      personalInfo: data.personalInfo ?? null,
      professionalProfile: data.professionalProfile ?? null,
      sections: data.sections ?? null,
      templateSelection: data.templateSelection ?? null,
      updatedAt: new Date(),
    };

    this.progressRecords.set(userId, record);

    return {
      currentStep: record.currentStep,
      completedSteps: record.completedSteps,
    };
  }

  async deleteProgress(userId: string): Promise<void> {
    this.progressRecords.delete(userId);
  }

  async deleteProgressWithTx(_tx: TransactionClient, userId: string): Promise<void> {
    this.progressRecords.delete(userId);
  }

  async findUserByUsername(username: string): Promise<{ id: string } | null> {
    // Check both committed users AND users claiming username during onboarding
    const existingUser = this.users.get(username);
    if (existingUser) return existingUser;

    // Check onboarding progress records
    const claimingProgress = Array.from(this.progressRecords.values()).find(
      (p) => p.username?.toLowerCase() === username.toLowerCase(),
    );

    return claimingProgress ? { id: claimingProgress.userId } : null;
  }

  // Test helpers
  seedProgress(record: OnboardingProgressRecord): void {
    this.progressRecords.set(record.userId, record);
  }

  seedUser(username: string, userId: string): void {
    this.users.set(username, { id: userId });
  }

  getProgress(userId: string): OnboardingProgressRecord | undefined {
    return this.progressRecords.get(userId);
  }

  getAllProgress(): OnboardingProgressRecord[] {
    return Array.from(this.progressRecords.values());
  }

  clear(): void {
    this.progressRecords.clear();
    this.users.clear();
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createOnboardingUser(
  overrides: Partial<OnboardingUserData> = {},
): OnboardingUserData {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hasCompletedOnboarding: false,
    onboardingCompletedAt: null,
    username: null,
    displayName: null,
    phone: null,
    location: null,
    bio: null,
    linkedin: null,
    github: null,
    website: null,
    ...overrides,
  };
}

export function createOnboardingProgress(
  overrides: Partial<OnboardingProgressRecord> = {},
): OnboardingProgressRecord {
  return {
    userId: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    currentStep: 'welcome',
    completedSteps: [],
    username: null,
    personalInfo: null,
    professionalProfile: null,
    sections: null,
    templateSelection: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createOnboardingData(overrides: Partial<OnboardingData> = {}): OnboardingData {
  return {
    username: 'johndoe',
    personalInfo: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      location: 'New York, USA',
    },
    professionalProfile: {
      jobTitle: 'Software Engineer',
      summary: 'Experienced developer',
      linkedin: 'https://linkedin.com/in/johndoe',
      github: 'https://github.com/johndoe',
      website: 'https://johndoe.dev',
    },
    templateSelection: {
      templateId: 'PROFESSIONAL',
      colorScheme: 'ocean',
    },
    sections: [],
    ...overrides,
  };
}

// ============================================================================
// DEFAULT TEST DATA
// ============================================================================

export const DEFAULT_ONBOARDING_USER: OnboardingUserData = createOnboardingUser({
  id: 'user-1',
  hasCompletedOnboarding: false,
});

export const DEFAULT_COMPLETED_ONBOARDING_USER: OnboardingUserData = createOnboardingUser({
  id: 'user-2',
  hasCompletedOnboarding: true,
  onboardingCompletedAt: new Date('2024-01-01'),
  username: 'completeduser',
  displayName: 'Completed User',
  bio: 'A user who completed onboarding',
});

export const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgressRecord = createOnboardingProgress({
  userId: 'user-1',
  currentStep: 'personal-info',
  completedSteps: ['welcome'],
  username: 'johndoe',
  personalInfo: {
    fullName: 'John Doe',
    email: 'john@example.com',
  },
});

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { InMemoryOnboardingCompletion } from './in-memory-onboarding-completion';
export {
  DEFAULT_SECTION_TYPES,
  InMemorySectionTypeDefinition,
} from './in-memory-section-type-definition';
