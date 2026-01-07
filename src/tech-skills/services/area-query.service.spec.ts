/**
 * TechAreaQueryService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Retorna areas corretamente
 * - Cache hit/miss behavior
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { TechAreaQueryService } from './area-query.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

describe('TechAreaQueryService', () => {
  let service: TechAreaQueryService;

  const mockAreasFromDb = [
    {
      id: '1',
      type: 'BACKEND',
      nameEn: 'Backend Development',
      namePtBr: 'Desenvolvimento Backend',
      descriptionEn: 'Server-side development',
      descriptionPtBr: 'Desenvolvimento server-side',
      icon: 'backend.svg',
      color: '#3498db',
      order: 1,
    },
    {
      id: '2',
      type: 'FRONTEND',
      nameEn: 'Frontend Development',
      namePtBr: 'Desenvolvimento Frontend',
      descriptionEn: 'Client-side development',
      descriptionPtBr: 'Desenvolvimento client-side',
      icon: 'frontend.svg',
      color: '#e74c3c',
      order: 2,
    },
  ];

  // In-memory cache
  const cacheStore = new Map<string, unknown>();

  const stubPrisma = {
    techArea: {
      findMany: mock().mockResolvedValue(mockAreasFromDb),
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
        TechAreaQueryService,
        { provide: PrismaService, useValue: stubPrisma },
        { provide: CacheService, useValue: stubCache },
      ],
    }).compile();

    service = module.get<TechAreaQueryService>(TechAreaQueryService);
  });

  describe('getAllAreas', () => {
    it('should return all active tech areas', async () => {
      const result = await service.getAllAreas();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        type: 'BACKEND',
        nameEn: 'Backend Development',
      });
      expect(result[1]).toMatchObject({
        type: 'FRONTEND',
        nameEn: 'Frontend Development',
      });
    });

    it('should include all area fields', async () => {
      const result = await service.getAllAreas();

      expect(result[0]).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        nameEn: expect.any(String),
        namePtBr: expect.any(String),
        descriptionEn: expect.any(String),
        descriptionPtBr: expect.any(String),
        icon: expect.any(String),
        color: expect.any(String),
        order: expect.any(Number),
      });
    });

    it('should return cached results on second call', async () => {
      // First call - should query DB
      await service.getAllAreas();
      expect(stubPrisma.techArea.findMany).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await service.getAllAreas();
      expect(stubPrisma.techArea.findMany).toHaveBeenCalledTimes(1);
    });

    it('should store results in cache after first query', async () => {
      await service.getAllAreas();

      expect(stubCache.set).toHaveBeenCalledWith(
        expect.stringContaining('areas'),
        mockAreasFromDb,
        expect.any(Number),
      );
    });

    it('should return results sorted by order', async () => {
      const result = await service.getAllAreas();

      expect(result[0].order).toBeLessThan(result[1].order);
    });
  });
});
