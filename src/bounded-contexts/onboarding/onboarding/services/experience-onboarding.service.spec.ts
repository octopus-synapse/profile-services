/**
 * ExperienceOnboardingService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Experiences criadas corretamente
 * - Validação de datas (startDate/endDate)
 * - Comportamento quando noExperience=true
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ExperienceOnboardingService } from './experience-onboarding.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { ResumeSectionOnboardingService } from './resume-section-onboarding.service';

describe('ExperienceOnboardingService', () => {
  let service: ExperienceOnboardingService;

  // In-memory store
  const experienceStore = new Map<string, any[]>();

  const createFakePrisma = () => ({});

  const mockSectionService = {
    replaceSectionItems: mock(
      (_tx: unknown, { resumeId, items }: { resumeId: string; items: any[] }) => {
        experienceStore.set(resumeId, items);
        return Promise.resolve();
      },
    ),
  };

  let fakePrisma: ReturnType<typeof createFakePrisma>;

  const createBaseOnboardingData = (): Omit<
    OnboardingData,
    'experiences' | 'noExperience'
  > => ({
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
    education: [],
    skills: [],
    languages: [],
    noEducation: false,
    noSkills: false,
  });

  beforeEach(async () => {
    experienceStore.clear();
    mockSectionService.replaceSectionItems.mockClear();
    fakePrisma = createFakePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperienceOnboardingService,
        { provide: PrismaService, useValue: fakePrisma },
        { provide: ResumeSectionOnboardingService, useValue: mockSectionService },
      ],
    }).compile();

    service = module.get<ExperienceOnboardingService>(
      ExperienceOnboardingService,
    );
  });

  describe('saveExperiences', () => {
    it('should save experience with all fields', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        experiences: [
          {
            company: 'Acme Corp',
            position: 'Senior Developer',
            startDate: '2020-01-15',
            endDate: '2023-06-30',
            isCurrent: false,
            description: 'Led development team',
          },
        ],
        noExperience: false,
      };

      await service.saveExperiences('resume-1', data);

      const saved = experienceStore.get('resume-1');
      expect(saved).toHaveLength(1);
      expect(saved![0]).toMatchObject({
        company: 'Acme Corp',
        role: 'Senior Developer',
        isCurrent: false,
        description: 'Led development team',
      });
      expect(typeof saved![0].startDate).toBe('string');
      expect(typeof saved![0].endDate).toBe('string');
    });

    it('should save current experience with null endDate', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        experiences: [
          {
            company: 'Current Job',
            position: 'Developer',
            startDate: '2022-03-01',
            isCurrent: true,
          },
        ],
        noExperience: false,
      };

      await service.saveExperiences('resume-1', data);

      const saved = experienceStore.get('resume-1');
      expect(saved![0].isCurrent).toBe(true);
      expect(saved![0].endDate).toBeNull();
    });

    it('should skip experience with invalid startDate', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        experiences: [
          {
            company: 'Valid Company',
            position: 'Developer',
            startDate: '2020-01-01',
            isCurrent: true,
          },
          {
            company: 'Invalid Company',
            position: 'Developer',
            startDate: 'invalid-date',
            isCurrent: true,
          },
        ],
        noExperience: false,
      };

      await service.saveExperiences('resume-1', data);

      const saved = experienceStore.get('resume-1');
      expect(saved).toHaveLength(1);
      expect(saved![0].company).toBe('Valid Company');
    });

    it('should skip experience with endDate before startDate', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        experiences: [
          {
            company: 'Valid Company',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: '2021-01-01',
            isCurrent: false,
          },
          {
            company: 'Invalid Dates',
            position: 'Developer',
            startDate: '2022-01-01',
            endDate: '2020-01-01', // Before start
            isCurrent: false,
          },
        ],
        noExperience: false,
      };

      await service.saveExperiences('resume-1', data);

      const saved = experienceStore.get('resume-1');
      expect(saved).toHaveLength(1);
      expect(saved![0].company).toBe('Valid Company');
    });

    it('should not save experiences when noExperience is true', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        experiences: [
          {
            company: 'Should Be Ignored',
            position: 'Developer',
            startDate: '2020-01-01',
            isCurrent: true,
          },
        ],
        noExperience: true,
      };

      await service.saveExperiences('resume-1', data);

      expect(mockSectionService.replaceSectionItems.mock.calls.length).toBe(0);
    });

    it('should not save experiences when array is empty', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        experiences: [],
        noExperience: false,
      };

      await service.saveExperiences('resume-1', data);

      expect(mockSectionService.replaceSectionItems.mock.calls.length).toBe(0);
    });

    it('should use empty string for missing description', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        experiences: [
          {
            company: 'Company',
            position: 'Developer',
            startDate: '2020-01-01',
            isCurrent: true,
            // no description
          },
        ],
        noExperience: false,
      };

      await service.saveExperiences('resume-1', data);

      const saved = experienceStore.get('resume-1');
      expect(saved![0].description).toBe('');
    });

    it('should replace existing experiences', async () => {
      // First save
      const firstData: OnboardingData = {
        ...createBaseOnboardingData(),
        experiences: [
          {
            company: 'Old Company',
            position: 'Developer',
            startDate: '2018-01-01',
            isCurrent: false,
            endDate: '2019-01-01',
          },
        ],
        noExperience: false,
      };
      await service.saveExperiences('resume-1', firstData);

      // Second save should replace
      const secondData: OnboardingData = {
        ...createBaseOnboardingData(),
        experiences: [
          {
            company: 'New Company',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            isCurrent: true,
          },
        ],
        noExperience: false,
      };
      await service.saveExperiences('resume-1', secondData);

      const saved = experienceStore.get('resume-1');
      expect(saved).toHaveLength(1);
      expect(saved![0].company).toBe('New Company');
    });
  });
});
