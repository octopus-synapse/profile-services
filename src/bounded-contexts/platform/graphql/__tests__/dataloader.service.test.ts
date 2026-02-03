import { describe, it, expect, beforeEach, mock, type Mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { DataLoaderService } from '../dataloaders/dataloader.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { Experience, Education, Skill } from '@prisma/client';

/**
 * DataLoader Service Tests
 *
 * Tests N+1 query optimization via DataLoader batching.
 * Ensures multiple loads are batched into single Prisma query.
 */
describe('DataLoaderService', () => {
  let service: DataLoaderService;
  let prisma: {
    experience: { findMany: Mock<any> };
    education: { findMany: Mock<any> };
    skill: { findMany: Mock<any> };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataLoaderService,
        {
          provide: PrismaService,
          useValue: {
            experience: { findMany: mock(() => Promise.resolve([])) },
            education: { findMany: mock(() => Promise.resolve([])) },
            skill: { findMany: mock(() => Promise.resolve([])) },
          },
        },
      ],
    }).compile();

    // Use resolve() for REQUEST-scoped providers
    service = await module.resolve<DataLoaderService>(DataLoaderService);
    prisma = module.get(PrismaService);
  });

  describe('createExperiencesLoader', () => {
    it('should batch multiple resume ID loads into single query', async () => {
      const mockExperiences: Experience[] = [
        {
          id: 'exp-1',
          resumeId: 'resume-1',
          company: 'Google',
          position: 'Engineer',
          isCurrent: true,
          skills: [],
          startDate: new Date(),
          endDate: null,
          description: null,
          location: null,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Experience,
        {
          id: 'exp-2',
          resumeId: 'resume-2',
          company: 'Meta',
          position: 'Engineer',
          isCurrent: true,
          skills: [],
          startDate: new Date(),
          endDate: null,
          description: null,
          location: null,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Experience,
      ];

      prisma.experience.findMany.mockImplementation(() =>
        Promise.resolve(mockExperiences),
      );

      const loader = service.createExperiencesLoader();

      // Load multiple resume IDs
      const [result1, result2] = await Promise.all([
        loader.load('resume-1'),
        loader.load('resume-2'),
      ]);

      // Should only call Prisma once (batched)
      expect(prisma.experience.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.experience.findMany).toHaveBeenCalledWith({
        where: { resumeId: { in: ['resume-1', 'resume-2'] } },
        orderBy: { order: 'asc' },
      });

      // Results should be correctly mapped
      expect(result1).toEqual([mockExperiences[0]]);
      expect(result2).toEqual([mockExperiences[1]]);
    });

    it('should return empty array for resume with no experiences', async () => {
      prisma.experience.findMany.mockImplementation(() => Promise.resolve([]));

      const loader = service.createExperiencesLoader();
      const result = await loader.load('resume-empty');

      expect(result).toEqual([]);
    });

    it('should group experiences by resumeId', async () => {
      const mockExperiences: Experience[] = [
        { id: 'exp-1', resumeId: 'resume-1', order: 0 } as Experience,
        { id: 'exp-2', resumeId: 'resume-1', order: 1 } as Experience,
        { id: 'exp-3', resumeId: 'resume-2', order: 0 } as Experience,
      ];

      prisma.experience.findMany.mockImplementation(() =>
        Promise.resolve(mockExperiences),
      );

      const loader = service.createExperiencesLoader();
      const result = await loader.load('resume-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('exp-1');
      expect(result[1].id).toBe('exp-2');
    });
  });

  describe('createEducationsLoader', () => {
    it('should batch education loads', async () => {
      const mockEducations: Education[] = [
        { id: 'edu-1', resumeId: 'resume-1', order: 0 } as Education,
      ];

      prisma.education.findMany.mockImplementation(() =>
        Promise.resolve(mockEducations),
      );

      const loader = service.createEducationsLoader();
      await loader.load('resume-1');

      expect(prisma.education.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('createSkillsLoader', () => {
    it('should batch skill loads', async () => {
      const mockSkills: Skill[] = [
        { id: 'skill-1', resumeId: 'resume-1', order: 0 } as Skill,
      ];

      prisma.skill.findMany.mockImplementation(() =>
        Promise.resolve(mockSkills),
      );

      const loader = service.createSkillsLoader();
      await loader.load('resume-1');

      expect(prisma.skill.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
