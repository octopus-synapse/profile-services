/**
 * MecStatsService Tests
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { MecStatsService } from './mec-stats.service';
import { InstitutionRepository, CourseRepository } from '../repositories';

describe('MecStatsService', () => {
  let service: MecStatsService;

  const stubInstitutionRepo = {
    count: mock().mockResolvedValue(2500),
    countByUf: mock().mockResolvedValue([
      { uf: 'SP', _count: 500 },
      { uf: 'RJ', _count: 300 },
      { uf: 'MG', _count: 250 },
    ]),
  };

  const stubCourseRepo = {
    count: mock().mockResolvedValue(45000),
    countByDegree: mock().mockResolvedValue([
      { grau: 'Bacharelado', _count: 20000 },
      { grau: 'Licenciatura', _count: 15000 },
      { grau: 'Tecnólogo', _count: 10000 },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MecStatsService,
        { provide: InstitutionRepository, useValue: stubInstitutionRepo },
        { provide: CourseRepository, useValue: stubCourseRepo },
      ],
    }).compile();

    service = module.get<MecStatsService>(MecStatsService);
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', async () => {
      const result = await service.getStats();

      expect(result).toMatchObject({
        totalInstitutions: 2500,
        totalCourses: 45000,
        coursesByGrau: expect.arrayContaining([
          expect.objectContaining({ grau: 'Bacharelado', count: 20000 }),
        ]),
        institutionsByUf: expect.arrayContaining([
          expect.objectContaining({ uf: 'SP', count: 500 }),
        ]),
      });
    });

    it('should include all course degree types', async () => {
      const result = await service.getStats();

      expect(result.coursesByGrau).toHaveLength(3);
      expect(result.coursesByGrau.map((g) => g.grau)).toEqual([
        'Bacharelado',
        'Licenciatura',
        'Tecnólogo',
      ]);
    });

    it('should include institutions by state', async () => {
      const result = await service.getStats();

      expect(result.institutionsByUf).toHaveLength(3);
      expect(result.institutionsByUf[0]).toMatchObject({
        uf: 'SP',
        count: 500,
      });
    });

    it('should handle null degree gracefully', async () => {
      stubCourseRepo.countByDegree.mockResolvedValueOnce([
        { grau: null, _count: 100 },
        { grau: 'Bacharelado', _count: 200 },
      ]);

      const result = await service.getStats();

      expect(result.coursesByGrau).toEqual([
        { grau: 'Não informado', count: 100 },
        { grau: 'Bacharelado', count: 200 },
      ]);
    });

    it('should fetch all data in parallel', async () => {
      await service.getStats();

      // All repository methods should be called
      expect(stubInstitutionRepo.count).toHaveBeenCalled();
      expect(stubCourseRepo.count).toHaveBeenCalled();
      expect(stubCourseRepo.countByDegree).toHaveBeenCalled();
      expect(stubInstitutionRepo.countByUf).toHaveBeenCalled();
    });
  });
});
