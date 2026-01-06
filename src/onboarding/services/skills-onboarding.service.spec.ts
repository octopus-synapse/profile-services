/**
 * SkillsOnboardingService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Skills criadas/substituídas corretamente
 * - Comportamento quando noSkills=true ou skills vazio
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SkillsOnboardingService } from './skills-onboarding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';

describe('SkillsOnboardingService', () => {
  let service: SkillsOnboardingService;

  // In-memory store
  const skillStore = new Map<string, any[]>();

  const createFakePrisma = () => ({
    skill: {
      deleteMany: jest.fn(({ where }: { where: { resumeId: string } }) => {
        skillStore.set(where.resumeId, []);
        return Promise.resolve({ count: 0 });
      }),
      createMany: jest.fn(({ data }: { data: any[] }) => {
        const resumeId = data[0]?.resumeId;
        if (resumeId) {
          skillStore.set(resumeId, data);
        }
        return Promise.resolve({ count: data.length });
      }),
    },
  });

  let fakePrisma: ReturnType<typeof createFakePrisma>;

  const createBaseOnboardingData = (): Omit<
    OnboardingData,
    'skills' | 'noSkills'
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
    education: [],
    languages: [],
    noExperience: false,
    noEducation: false,
  });

  beforeEach(async () => {
    skillStore.clear();
    fakePrisma = createFakePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsOnboardingService,
        { provide: PrismaService, useValue: fakePrisma },
      ],
    }).compile();

    service = module.get<SkillsOnboardingService>(SkillsOnboardingService);
  });

  describe('saveSkills', () => {
    it('should save skills with correct order', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        skills: [
          { name: 'TypeScript', category: 'Programming' },
          { name: 'React', category: 'Frontend' },
          { name: 'Node.js', category: 'Backend' },
        ],
        noSkills: false,
      };

      await service.saveSkills('resume-1', data);

      const savedSkills = skillStore.get('resume-1');
      expect(savedSkills).toHaveLength(3);
      expect(savedSkills![0]).toMatchObject({
        resumeId: 'resume-1',
        name: 'TypeScript',
        category: 'Programming',
        order: 0,
      });
      expect(savedSkills![1]).toMatchObject({
        name: 'React',
        category: 'Frontend',
        order: 1,
      });
      expect(savedSkills![2]).toMatchObject({
        name: 'Node.js',
        category: 'Backend',
        order: 2,
      });
    });

    it('should use empty string for missing category', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        skills: [{ name: 'Docker' }],
        noSkills: false,
      };

      await service.saveSkills('resume-1', data);

      const savedSkills = skillStore.get('resume-1');
      expect(savedSkills![0].category).toBe('');
    });

    it('should not save skills when noSkills is true', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        skills: [{ name: 'Ignored Skill' }],
        noSkills: true,
      };

      await service.saveSkills('resume-1', data);

      expect(fakePrisma.skill.createMany).not.toHaveBeenCalled();
    });

    it('should not save skills when skills array is empty', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        skills: [],
        noSkills: false,
      };

      await service.saveSkills('resume-1', data);

      expect(fakePrisma.skill.createMany).not.toHaveBeenCalled();
    });

    it('should replace existing skills', async () => {
      // First save
      const firstData: OnboardingData = {
        ...createBaseOnboardingData(),
        skills: [{ name: 'JavaScript' }],
        noSkills: false,
      };
      await service.saveSkills('resume-1', firstData);

      // Second save should replace
      const secondData: OnboardingData = {
        ...createBaseOnboardingData(),
        skills: [{ name: 'Python' }, { name: 'Go' }],
        noSkills: false,
      };
      await service.saveSkills('resume-1', secondData);

      const savedSkills = skillStore.get('resume-1');
      expect(savedSkills).toHaveLength(2);
      expect(savedSkills!.map((s) => s.name)).toEqual(['Python', 'Go']);
    });

    it('should set level to null for all skills', async () => {
      const data: OnboardingData = {
        ...createBaseOnboardingData(),
        skills: [{ name: 'Skill1' }, { name: 'Skill2' }],
        noSkills: false,
      };

      await service.saveSkills('resume-1', data);

      const savedSkills = skillStore.get('resume-1');
      expect(savedSkills!.every((s) => s.level === null)).toBe(true);
    });
  });
});
