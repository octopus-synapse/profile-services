/**
 * ResumeOnboardingService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Resume criado/atualizado corretamente
 * - Primary resume definido quando é o primeiro
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeOnboardingService } from './resume-onboarding.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';

describe('ResumeOnboardingService', () => {
  let service: ResumeOnboardingService;

  // In-memory stores
  const resumeStore = new Map<string, any>();
  const userStore = new Map<string, any>();
  let idCounter = 1;

  const createFakePrisma = () => ({
    resume: {
      findFirst: mock(({ where }: { where: { userId: string } }) => {
        const resume = Array.from(resumeStore.values()).find(
          (r) => r.userId === where.userId,
        );
        return Promise.resolve(resume ?? null);
      }),
      upsert: mock(
        ({
          where,
          update,
          create,
        }: {
          where: { id: string };
          update: any;
          create: any;
        }) => {
          const existing = resumeStore.get(where.id);
          if (existing) {
            const updated = { ...existing, ...update };
            resumeStore.set(where.id, updated);
            return Promise.resolve(updated);
          }
          const newResume = { id: `resume-${idCounter++}`, ...create };
          resumeStore.set(newResume.id, newResume);
          return Promise.resolve(newResume);
        },
      ),
    },
    user: {
      update: mock(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: { primaryResumeId: string };
        }) => {
          const user = userStore.get(where.id) ?? { id: where.id };
          const updated = { ...user, ...data };
          userStore.set(where.id, updated);
          return Promise.resolve(updated);
        },
      ),
    },
  });

  let fakePrisma: ReturnType<typeof createFakePrisma>;

  const createValidOnboardingData = (
    overrides: Partial<OnboardingData> = {},
  ): OnboardingData => ({
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
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    noExperience: false,
    noEducation: false,
    noSkills: false,
    ...overrides,
  });

  beforeEach(async () => {
    resumeStore.clear();
    userStore.clear();
    idCounter = 1;
    fakePrisma = createFakePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeOnboardingService,
        { provide: PrismaService, useValue: fakePrisma },
      ],
    }).compile();

    service = module.get<ResumeOnboardingService>(ResumeOnboardingService);
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

      const user = userStore.get('user-1');
      expect(user.primaryResumeId).toBe(result.id);
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
      const user = userStore.get('user-1');
      expect(user.primaryResumeId).toBe(firstResume.id);
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
      const userResumes = Array.from(resumeStore.values()).filter(
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
