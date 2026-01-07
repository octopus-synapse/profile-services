/**
 * TechNicheQueryService Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { TechNicheQueryService } from './niche-query.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

describe('TechNicheQueryService', () => {
  let service: TechNicheQueryService;

  const mockNichesFromDb = [
    {
      id: '1',
      slug: 'nodejs',
      nameEn: 'Node.js',
      namePtBr: 'Node.js',
      descriptionEn: 'JavaScript runtime',
      descriptionPtBr: 'Runtime JavaScript',
      icon: 'nodejs.svg',
      color: '#339933',
      areaId: 'area-1',
      area: { type: 'BACKEND', nameEn: 'Backend' },
    },
    {
      id: '2',
      slug: 'react',
      nameEn: 'React',
      namePtBr: 'React',
      descriptionEn: 'UI library',
      descriptionPtBr: 'Biblioteca de UI',
      icon: 'react.svg',
      color: '#61DAFB',
      areaId: 'area-2',
      area: { type: 'FRONTEND', nameEn: 'Frontend' },
    },
  ];

  const cacheStore = new Map<string, unknown>();

  const stubPrisma = {
    techNiche: {
      findMany: mock().mockResolvedValue(mockNichesFromDb),
    },
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
        TechNicheQueryService,
        { provide: PrismaService, useValue: stubPrisma },
        { provide: CacheService, useValue: stubCache },
      ],
    }).compile();

    service = module.get<TechNicheQueryService>(TechNicheQueryService);
  });

  describe('getAllNiches', () => {
    it('should return all niches with area information', async () => {
      const result = await service.getAllNiches();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        slug: 'nodejs',
        nameEn: 'Node.js',
      });
    });

    it('should cache results', async () => {
      await service.getAllNiches();
      await service.getAllNiches();

      expect(stubPrisma.techNiche.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNichesByArea', () => {
    it('should return niches filtered by area type', async () => {
      stubPrisma.techNiche.findMany.mockResolvedValueOnce([
        mockNichesFromDb[0],
      ]);

      const result = await service.getNichesByArea('DEVELOPMENT');

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('nodejs');
    });
  });
});
