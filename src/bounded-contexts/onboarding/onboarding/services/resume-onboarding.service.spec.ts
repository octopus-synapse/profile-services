/**
 * ResumeOnboardingService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Resume criado/atualizado corretamente
 * - Primary resume definido quando é o primeiro
 *
 * Pure Bun tests with In-Memory stores.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { ResumeOnboardingService } from './resume-onboarding.service';

// ============================================================================
// In-Memory Fake Prisma
// ============================================================================

interface ResumeRecord {
  id: string;
  userId: string;
  fullName?: string;
  emailContact?: string;
  phone?: string;
  location?: string;
  jobTitle?: string;
  summary?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  template?: string;
  [key: string]: unknown;
}

interface UserRecord {
  id: string;
  primaryResumeId?: string;
}

function createFakePrismaStore() {
  const resumeStore = new Map<string, ResumeRecord>();
  const userStore = new Map<string, UserRecord>();
  let idCounter = 1;

  return {
    resumeStore,
    userStore,
    reset() {
      resumeStore.clear();
      userStore.clear();
      idCounter = 1;
    },
    prisma: {
      resume: {
        findFirst: async ({ where }: { where: { userId: string } }) => {
          const resume = Array.from(resumeStore.values()).find((r) => r.userId === where.userId);
          return resume ?? null;
        },
        upsert: async ({
          where,
          update,
          create,
        }: {
          where: { id: string };
          update: Partial<ResumeRecord>;
          create: Partial<ResumeRecord>;
        }) => {
          const existing = resumeStore.get(where.id);
          if (existing) {
            const updated = { ...existing, ...update };
            resumeStore.set(where.id, updated);
            return updated;
          }
          const newResume = { id: `resume-${idCounter++}`, ...create } as ResumeRecord;
          resumeStore.set(newResume.id, newResume);
          return newResume;
        },
      },
      user: {
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { primaryResumeId: string };
        }) => {
          const user = userStore.get(where.id) ?? { id: where.id };
          const updated = { ...user, ...data };
          userStore.set(where.id, updated);
          return updated;
        },
      },
    } as unknown as PrismaService,
  };
}

// ============================================================================
// Test Helper
// ============================================================================

const createValidOnboardingData = (overrides: Partial<OnboardingData> = {}): OnboardingData => ({
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
    template: 'CLASSIC',
    palette: 'DEFAULT',
  },
  sections: [],
  ...overrides,
});

describe('ResumeOnboardingService', () => {
  let service: ResumeOnboardingService;
  let store: ReturnType<typeof createFakePrismaStore>;

  beforeEach(() => {
    store = createFakePrismaStore();
    service = new ResumeOnboardingService(store.prisma);
  });

  describe('upsertResume', () => {
    it('should create new resume with all personal info fields', async () => {
      const data = createValidOnboardingData();

      const result = await service.upsertResume('user-1', data);

      expect(result).toMatchObject({
        id: expect.any(String),
        userId: 'user-1',
        fullName: 'John Doe',
        emailContact: 'john@example.com',
        phone: '+1234567890',
        location: 'New York, USA',
        jobTitle: 'Software Engineer',
        summary: 'Experienced developer',
        template: 'CLASSIC',
      });
    });

    it('should create resume with professional profile links', async () => {
      const data = createValidOnboardingData();

      const result = await service.upsertResume('user-1', data);

      expect(result).toMatchObject({
        linkedin: 'https://linkedin.com/in/johndoe',
        github: 'https://github.com/johndoe',
        website: 'https://johndoe.dev',
      });
    });

    it('should set primary resume when creating first resume for user', async () => {
      const data = createValidOnboardingData();

      const result = await service.upsertResume('user-1', data);

      const user = store.userStore.get('user-1');
      expect(user?.primaryResumeId).toBe(result.id);
    });

    it('should not change primary resume when updating existing resume', async () => {
      // Create first resume
      const data = createValidOnboardingData();
      const firstResume = await service.upsertResume('user-1', data);

      // Update existing resume
      const updatedData = createValidOnboardingData({
        personalInfo: {
          ...data.personalInfo,
          fullName: 'John Updated',
        },
      });

      await service.upsertResume('user-1', updatedData);

      // Primary should still point to first resume
      const user = store.userStore.get('user-1');
      expect(user?.primaryResumeId).toBe(firstResume.id);
    });

    it('should update existing resume instead of creating new one', async () => {
      const data = createValidOnboardingData();
      await service.upsertResume('user-1', data);

      const updatedData = createValidOnboardingData({
        personalInfo: {
          ...data.personalInfo,
          fullName: 'John Updated',
        },
      });

      await service.upsertResume('user-1', updatedData);

      // Should still have only one resume
      const userResumes = Array.from(store.resumeStore.values()).filter(
        (r) => r.userId === 'user-1',
      );
      expect(userResumes).toHaveLength(1);
      expect(userResumes[0].fullName).toBe('John Updated');
    });

    it('should handle different template selections', async () => {
      const data = createValidOnboardingData({
        templateSelection: { template: 'MODERN', palette: 'DARK' },
      });

      const result = await service.upsertResume('user-1', data);

      expect(result.template).toBe('MODERN');
    });
  });
});
