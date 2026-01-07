/**
 * ExperienceOnboardingService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Experiences criadas corretamente
 * - Validação de datas (startDate/endDate)
 * - Comportamento quando noExperience=true
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExperienceOnboardingService } from './experience-onboarding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';

describe('ExperienceOnboardingService', () => {
  let service: ExperienceOnboardingService;

  // In-memory store
  const experienceStore = new Map<string, any[]>();

  const createFakePrisma = () => ({
    experience: {
      deleteMany: jest.fn(({ where }: { where: { resumeId: string } }) => {
        experienceStore.set(where.resumeId, []);
        return Promise.resolve({ count: 0 });
      }),
      createMany: jest.fn(({ data }: { data: any[] }) => {
        const resumeId = data[0]?.resumeId;
        if (resumeId) {
          experienceStore.set(resumeId, data);
        }
        return Promise.resolve({ count: data.length });
      }),
    },
  });

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
    fakePrisma = createFakePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperienceOnboardingService,
        { provide: PrismaService, useValue: fakePrisma },
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
        resumeId: 'resume-1',
        company: 'Acme Corp',
        position: 'Senior Developer',
        isCurrent: false,
        description: 'Led development team',
      });
      expect(saved![0].startDate).toBeInstanceOf(Date);
      expect(saved![0].endDate).toBeInstanceOf(Date);
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

      expect(fakePrisma.experience.createMany).not.toHaveBeenCalled();
    });

    it('should not save experiences when array is empty', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        experiences: [],
        noExperience: false,
      };

      await service.saveExperiences('resume-1', data);

      expect(fakePrisma.experience.createMany).not.toHaveBeenCalled();
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
