import { describe, expect, it, mock } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { MecCourseRepositoryPort } from '../../domain/ports/mec-course.repository.port';
import { MecInstitutionRepositoryPort } from '../../domain/ports/mec-institution.repository.port';
import { MecStatsService } from './mec-stats.service';

const buildInstitutionRepo = (
  overrides: Partial<MecInstitutionRepositoryPort> = {},
): MecInstitutionRepositoryPort =>
  ({
    countActiveInstitutions: mock().mockResolvedValue(2500),
    countInstitutionsByUf: mock().mockResolvedValue([
      { uf: 'SP', _count: 500 },
      { uf: 'RJ', _count: 300 },
      { uf: 'MG', _count: 250 },
    ]),
    listActiveInstitutions: mock().mockResolvedValue([]),
    findInstitutionsByUf: mock().mockResolvedValue([]),
    findInstitutionByCode: mock().mockResolvedValue(null),
    searchInstitutionsByName: mock().mockResolvedValue([]),
    listDistinctUfs: mock().mockResolvedValue([]),
    listExistingInstitutionCodes: mock().mockResolvedValue(new Set()),
    bulkCreateInstitutions: mock().mockResolvedValue(0),
    ...overrides,
  }) as unknown as MecInstitutionRepositoryPort;

const buildCourseRepo = (
  overrides: Partial<MecCourseRepositoryPort> = {},
): MecCourseRepositoryPort =>
  ({
    countActiveCourses: mock().mockResolvedValue(45000),
    countCoursesByDegree: mock().mockResolvedValue([
      { grau: 'Bacharelado', _count: 20000 },
      { grau: 'Licenciatura', _count: 15000 },
      { grau: 'Tecnólogo', _count: 10000 },
    ]),
    findCoursesByInstitutionCode: mock().mockResolvedValue([]),
    findCourseByCode: mock().mockResolvedValue(null),
    searchCoursesByName: mock().mockResolvedValue([]),
    listDistinctKnowledgeAreas: mock().mockResolvedValue([]),
    listExistingCourseCodes: mock().mockResolvedValue(new Set()),
    bulkCreateCourses: mock().mockResolvedValue(0),
    ...overrides,
  }) as unknown as MecCourseRepositoryPort;

describe('MecStatsService', () => {
  it('returns aggregated statistics', async () => {
    const service = new MecStatsService(stubLogger, buildInstitutionRepo(), buildCourseRepo());

    const result = await service.getMecStatistics();

    expect(result).toMatchObject({
      totalInstitutions: 2500,
      totalCourses: 45000,
    });
    expect(result.coursesByGrau).toHaveLength(3);
    expect(result.institutionsByUf).toEqual([
      { uf: 'SP', count: 500 },
      { uf: 'RJ', count: 300 },
      { uf: 'MG', count: 250 },
    ]);
  });

  it('handles null degree gracefully', async () => {
    const service = new MecStatsService(
      stubLogger,
      buildInstitutionRepo(),
      buildCourseRepo({
        countCoursesByDegree: mock().mockResolvedValue([
          { grau: null, _count: 100 },
          { grau: 'Bacharelado', _count: 200 },
        ]),
      } as Partial<MecCourseRepositoryPort>),
    );

    const result = await service.getMecStatistics();

    expect(result.coursesByGrau).toEqual([
      { grau: 'Não informado', count: 100 },
      { grau: 'Bacharelado', count: 200 },
    ]);
  });
});
