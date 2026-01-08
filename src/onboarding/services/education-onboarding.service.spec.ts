/**
 * EducationOnboardingService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Education entries criadas corretamente
 * - Validação de datas (startDate/endDate)
 * - Comportamento quando noEducation=true
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { EducationOnboardingService } from './education-onboarding.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';

describe('EducationOnboardingService', () => {
  let service: EducationOnboardingService;

  // In-memory store
  const educationStore = new Map<string, any[]>();

  const createFakePrisma = () => ({
    education: {
      deleteMany: mock(({ where }: { where: { resumeId: string } }) => {
        educationStore.set(where.resumeId, []);
        return Promise.resolve({ count: 0 });
      }),
      createMany: mock(({ data }: { data: any[] }) => {
        const resumeId = data[0]?.resumeId;
        if (resumeId) {
          educationStore.set(resumeId, data);
        }
        return Promise.resolve({ count: data.length });
      }),
    },
  });

  let fakePrisma: ReturnType<typeof createFakePrisma>;

  const createBaseOnboardingData = (): Omit<
    OnboardingData,
    'education' | 'noEducation'
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
    experiences: [],
    skills: [],
    languages: [],
    noExperience: false,
    noSkills: false,
  });

  beforeEach(async () => {
    educationStore.clear();
    fakePrisma = createFakePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EducationOnboardingService,
        { provide: PrismaService, useValue: fakePrisma },
      ],
    }).compile();

    service = module.get<EducationOnboardingService>(
      EducationOnboardingService,
    );
  });

  describe('saveEducation', () => {
    it('should save education with all fields', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        education: [
          {
            institution: 'MIT',
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            startDate: '2015-09-01',
            endDate: '2019-05-15',
            isCurrent: false,
          },
        ],
        noEducation: false,
      };

      await service.saveEducation('resume-1', data);

      const saved = educationStore.get('resume-1');
      expect(saved).toHaveLength(1);
      expect(saved![0]).toMatchObject({
        resumeId: 'resume-1',
        institution: 'MIT',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        isCurrent: false,
      });
      expect(saved![0].startDate).toBeInstanceOf(Date);
      expect(saved![0].endDate).toBeInstanceOf(Date);
    });

    it('should save current education with null endDate', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        education: [
          {
            institution: 'Stanford',
            degree: 'Master of Science',
            field: 'AI',
            startDate: '2022-09-01',
            isCurrent: true,
          },
        ],
        noEducation: false,
      };

      await service.saveEducation('resume-1', data);

      const saved = educationStore.get('resume-1');
      expect(saved![0].isCurrent).toBe(true);
      expect(saved![0].endDate).toBeNull();
    });

    it('should skip education with invalid startDate', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        education: [
          {
            institution: 'Valid University',
            degree: 'BS',
            field: 'Computer Science',
            startDate: '2015-09-01',
            isCurrent: true,
          },
          {
            institution: 'Invalid University',
            degree: 'MS',
            field: 'Computer Science',
            startDate: 'not-a-date',
            isCurrent: true,
          },
        ],
        noEducation: false,
      };

      await service.saveEducation('resume-1', data);

      const saved = educationStore.get('resume-1');
      expect(saved).toHaveLength(1);
      expect(saved![0].institution).toBe('Valid University');
    });

    it('should skip education with endDate before startDate', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        education: [
          {
            institution: 'Valid University',
            degree: 'BS',
            field: 'Computer Science',
            startDate: '2015-09-01',
            endDate: '2019-05-01',
            isCurrent: false,
          },
          {
            institution: 'Invalid Dates University',
            degree: 'MS',
            field: 'Computer Science',
            startDate: '2022-01-01',
            endDate: '2020-01-01', // Before start
            isCurrent: false,
          },
        ],
        noEducation: false,
      };

      await service.saveEducation('resume-1', data);

      const saved = educationStore.get('resume-1');
      expect(saved).toHaveLength(1);
      expect(saved![0].institution).toBe('Valid University');
    });

    it('should not save education when noEducation is true', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        education: [
          {
            institution: 'Should Be Ignored',
            degree: 'PhD',
            field: 'Computer Science',
            startDate: '2020-01-01',
            isCurrent: true,
          },
        ],
        noEducation: true,
      };

      await service.saveEducation('resume-1', data);

      expect(fakePrisma.education.createMany.mock.calls.length).toBe(0);
    });

    it('should not save education when array is empty', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        education: [],
        noEducation: false,
      };

      await service.saveEducation('resume-1', data);

      expect(fakePrisma.education.createMany.mock.calls.length).toBe(0);
    });

    it('should allow empty field', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        education: [
          {
            institution: 'University',
            degree: 'Bachelor',
            field: '',
            startDate: '2015-09-01',
            isCurrent: true,
          },
        ],
        noEducation: false,
      };

      await service.saveEducation('resume-1', data);

      const saved = educationStore.get('resume-1');
      expect(saved![0].field).toBe('');
    });

    it('should replace existing education', async () => {
      // First save
      const firstData: OnboardingData = {
        ...createBaseOnboardingData(),
        education: [
          {
            institution: 'Old University',
            degree: 'BS',
            field: 'Computer Science',
            startDate: '2010-09-01',
            endDate: '2014-05-01',
            isCurrent: false,
          },
        ],
        noEducation: false,
      };
      await service.saveEducation('resume-1', firstData);

      // Second save should replace
      const secondData: OnboardingData = {
        ...createBaseOnboardingData(),
        education: [
          {
            institution: 'New University',
            degree: 'MS',
            field: 'Computer Science',
            startDate: '2020-09-01',
            isCurrent: true,
          },
        ],
        noEducation: false,
      };
      await service.saveEducation('resume-1', secondData);

      const saved = educationStore.get('resume-1');
      expect(saved).toHaveLength(1);
      expect(saved![0].institution).toBe('New University');
    });
  });
});
