import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecCourseRepository } from '../../../testing/in-memory-mec.repository';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
import { CourseQueryService } from '../../services/course-query.service';
import { GetCourseByCodeUseCase } from './get-course-by-code.use-case';

describe('GetCourseByCodeUseCase', () => {
  it('returns the course when the code is found', async () => {
    const repo = new InMemoryMecCourseRepository();
    repo.seedCourse({ codigoCurso: 100, codigoIes: 1, nome: 'CC' });
    const useCase = new GetCourseByCodeUseCase(
      new CourseQueryService(stubLogger, repo, new InMemoryMecCache()),
    );

    const result = await useCase.execute(100);
    expect(result?.codigoCurso).toBe(100);
  });

  it('returns null for unknown codes', async () => {
    const useCase = new GetCourseByCodeUseCase(
      new CourseQueryService(stubLogger, new InMemoryMecCourseRepository(), new InMemoryMecCache()),
    );
    expect(await useCase.execute(999)).toBeNull();
  });
});
