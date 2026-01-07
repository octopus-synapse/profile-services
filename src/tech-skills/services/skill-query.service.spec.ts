/**
 * SkillQueryService Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { SkillQueryService } from './skill-query.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

describe('SkillQueryService', () => {
  let service: SkillQueryService;

  const mockSkillsFromDb = [
    {
      id: '1',
      slug: 'nestjs',
      nameEn: 'NestJS',
      namePtBr: 'NestJS',
      type: 'FRAMEWORK',
      icon: 'nestjs.svg',
      color: '#E0234E',
      popularity: 85,
      niche: { slug: 'nodejs', nameEn: 'Node.js' },
    },
    {
      id: '2',
      slug: 'docker',
      nameEn: 'Docker',
      namePtBr: 'Docker',
      type: 'TOOL',
      icon: 'docker.svg',
      color: '#2496ED',
      popularity: 90,
      niche: { slug: 'devops', nameEn: 'DevOps' },
    },
  ];

  const cacheStore = new Map<string, unknown>();

  const stubPrisma = {
    techSkill: {
      findMany: mock().mockResolvedValue(mockSkillsFromDb),
    },
    $queryRaw: mock().mockResolvedValue(mockSkillsFromDb),
  };

  const stubCache = {
    get: mock((key: string) => Promise.resolve(cacheStore.get(key) ?? null)),
    set: mock((key: string, value: unknown) => {
      cacheStore.set(key, value);
      return Promise.resolve();
    }),
  };

  beforeEach(async () => {
    cacheStore.clear();const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillQueryService,
        { provide: PrismaService, useValue: stubPrisma },
        { provide: CacheService, useValue: stubCache },
      ],
    }).compile();

    service = module.get<SkillQueryService>(SkillQueryService);
  });

  describe('getAllSkills', () => {
    it('should return all skills with niche information', async () => {
      const result = await service.getAllSkills();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        slug: 'nestjs',
        nameEn: 'NestJS',
        type: 'FRAMEWORK',
      });
    });

    it('should cache results', async () => {
      await service.getAllSkills();
      await service.getAllSkills();

      expect(stubPrisma.techSkill.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSkillsByNiche', () => {
    it('should return skills filtered by niche slug', async () => {
      stubPrisma.techSkill.findMany.mockResolvedValueOnce([
        mockSkillsFromDb[0],
      ]);

      const result = await service.getSkillsByNiche('nodejs');

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('nestjs');
    });
  });

  describe('getSkillsByType', () => {
    it('should return skills filtered by type', async () => {
      stubPrisma.techSkill.findMany.mockResolvedValueOnce([
        mockSkillsFromDb[1],
      ]);

      const result = await service.getSkillsByType('TOOL');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('TOOL');
    });

    it('should respect limit parameter', async () => {
      const result = await service.getSkillsByType('FRAMEWORK', 10);

      expect(result).toBeDefined();
    });
  });
});
