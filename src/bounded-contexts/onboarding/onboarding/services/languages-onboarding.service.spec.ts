/**
 * LanguagesOnboardingService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Languages criadas corretamente
 * - Comportamento quando languages array vazio
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { LanguagesOnboardingService } from './languages-onboarding.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { ResumeSectionOnboardingService } from './resume-section-onboarding.service';

describe('LanguagesOnboardingService', () => {
  let service: LanguagesOnboardingService;

  // In-memory store
  const languageStore = new Map<string, any[]>();

  const createFakePrisma = () => ({});

  const mockSectionService = {
    replaceSectionItems: mock(
      (_tx: unknown, { resumeId, items }: { resumeId: string; items: any[] }) => {
        languageStore.set(resumeId, items);
        return Promise.resolve();
      },
    ),
  };

  let fakePrisma: ReturnType<typeof createFakePrisma>;

  const createBaseOnboardingData = (): Omit<OnboardingData, 'languages'> => ({
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
    },
    templateSelection: { template: 'CLASSIC', palette: 'DEFAULT' },
    experiences: [],
    education: [],
    skills: [],
    noExperience: false,
    noEducation: false,
    noSkills: false,
  });

  beforeEach(async () => {
    languageStore.clear();
    mockSectionService.replaceSectionItems.mockClear();
    fakePrisma = createFakePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguagesOnboardingService,
        { provide: PrismaService, useValue: fakePrisma },
        { provide: ResumeSectionOnboardingService, useValue: mockSectionService },
      ],
    }).compile();

    service = module.get<LanguagesOnboardingService>(
      LanguagesOnboardingService,
    );
  });

  describe('saveLanguages', () => {
    it('should save languages with correct order', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        languages: [
          { name: 'English', level: 'NATIVE' },
          { name: 'Spanish', level: 'INTERMEDIATE' },
          { name: 'French', level: 'BASIC' },
        ],
      };

      await service.saveLanguages('resume-1', data);

      const saved = languageStore.get('resume-1');
      expect(saved).toHaveLength(3);
      expect(saved![0]).toMatchObject({
        name: 'English',
        level: 'NATIVE',
      });
      expect(saved![1]).toMatchObject({
        name: 'Spanish',
        level: 'INTERMEDIATE',
      });
      expect(saved![2]).toMatchObject({
        name: 'French',
        level: 'BASIC',
      });
    });

    it('should not save languages when array is empty', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        languages: [],
      };

      await service.saveLanguages('resume-1', data);

      expect(mockSectionService.replaceSectionItems.mock.calls.length).toBe(0);
    });

    it('should replace existing languages', async () => {
      // First save
      const firstData: OnboardingData = {
        ...createBaseOnboardingData(),
        languages: [{ name: 'German', level: 'BASIC' }],
      };
      await service.saveLanguages('resume-1', firstData);

      // Second save should replace
      const secondData: OnboardingData = {
        ...createBaseOnboardingData(),
        languages: [
          { name: 'Japanese', level: 'BASIC' },
          { name: 'Korean', level: 'BASIC' },
        ],
      };
      await service.saveLanguages('resume-1', secondData);

      const saved = languageStore.get('resume-1');
      expect(saved).toHaveLength(2);
      expect(saved!.map((l) => l.name)).toEqual(['Japanese', 'Korean']);
    });

    it('should map name field to name in storage', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        languages: [{ name: 'Portuguese', level: 'NATIVE' }],
      };

      await service.saveLanguages('resume-1', data);

      const saved = languageStore.get('resume-1');
      expect(saved![0].name).toBe('Portuguese');
    });

    it('should map level field to level in storage', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        languages: [{ name: 'Italian', level: 'INTERMEDIATE' }],
      };

      await service.saveLanguages('resume-1', data);

      const saved = languageStore.get('resume-1');
      expect(saved![0].level).toBe('INTERMEDIATE');
    });

    it('should handle single language', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        languages: [{ name: 'Mandarin', level: 'NATIVE' }],
      };

      await service.saveLanguages('resume-1', data);

      const saved = languageStore.get('resume-1');
      expect(saved).toHaveLength(1);
      expect(saved![0]).toMatchObject({ name: 'Mandarin', level: 'NATIVE' });
    });
  });
});
