import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InMemoryMecCourseRepository,
  InMemoryMecInstitutionRepository,
} from '../../../testing/in-memory-mec-repositories';
import { MecStatsService } from '../../services/mec-stats.service';
import { GetMecStatisticsUseCase } from './get-mec-statistics.use-case';

describe('GetMecStatisticsUseCase', () => {
  it('returns aggregated counts', async () => {
    const institutionRepo = new InMemoryMecInstitutionRepository();
    institutionRepo.seedInstitution({ codigoIes: 1, nome: 'A', uf: 'SP' });
    institutionRepo.seedInstitution({ codigoIes: 2, nome: 'B', uf: 'RJ' });

    const courseRepo = new InMemoryMecCourseRepository();
    courseRepo.seedCourse({ codigoCurso: 1, codigoIes: 1, nome: 'X', grau: 'Bacharelado' });

    const useCase = new GetMecStatisticsUseCase(
      new MecStatsService(stubLogger, institutionRepo, courseRepo),
    );

    const result = await useCase.execute();

    expect(result.totalInstitutions).toBe(2);
    expect(result.totalCourses).toBe(1);
  });
});
