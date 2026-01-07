/**
 * LanguagesOnboardingService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Languages criadas corretamente
 * - Comportamento quando languages array vazio
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LanguagesOnboardingService } from './languages-onboarding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';

describe('LanguagesOnboardingService', () => {
  let service: LanguagesOnboardingService;

  // In-memory store
  const languageStore = new Map<string, any[]>();

  const createFakePrisma = () => ({
    language: {
      deleteMany: jest.fn(({ where }: { where: { resumeId: string } }) => {
        languageStore.set(where.resumeId, []);
        return Promise.resolve({ count: 0 });
      }),
      createMany: jest.fn(({ data }: { data: any[] }) => {
        const resumeId = data[0]?.resumeId;
        if (resumeId) {
          languageStore.set(resumeId, data);
        }
        return Promise.resolve({ count: data.length });
      }),
    },
  });

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
    fakePrisma = createFakePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguagesOnboardingService,
        { provide: PrismaService, useValue: fakePrisma },
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
        resumeId: 'resume-1',
        name: 'English',
        level: 'NATIVE',
        order: 0,
      });
      expect(saved![1]).toMatchObject({
        name: 'Spanish',
        level: 'INTERMEDIATE',
        order: 1,
      });
      expect(saved![2]).toMatchObject({
        name: 'French',
        level: 'BASIC',
        order: 2,
      });
    });

    it('should not save languages when array is empty', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        languages: [],
      };

      await service.saveLanguages('resume-1', data);

      expect(fakePrisma.language.createMany).not.toHaveBeenCalled();
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
      expect(saved![0].order).toBe(0);
    });
  });
});
