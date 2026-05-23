import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecCourseRepository } from '../../../testing/in-memory-mec.repository';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
import { CourseQueryService } from '../../services/course-query.service';
import { ListCoursesByInstitutionUseCase } from './list-courses-by-institution.use-case';

describe('ListCoursesByInstitutionUseCase', () => {
  it('returns courses for the given institution', async () => {
    const repo = new InMemoryMecCourseRepository();
    repo.seedCourse({ codigoCurso: 100, codigoIes: 1, nome: 'CC' });
    repo.seedCourse({ codigoCurso: 101, codigoIes: 2, nome: 'EE' });
    const useCase = new ListCoursesByInstitutionUseCase(
      new CourseQueryService(stubLogger, repo, new InMemoryMecCache()),
    );

    const result = await useCase.execute(1);
    expect(result).toHaveLength(1);
    expect(result[0].codigoCurso).toBe(100);
  });
});
