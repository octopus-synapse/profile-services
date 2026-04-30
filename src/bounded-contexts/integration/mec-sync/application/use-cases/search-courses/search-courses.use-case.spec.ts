import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
import { InMemoryMecCourseRepository } from '../../../testing/in-memory-mec-repositories';
import { CourseQueryService } from '../../services/course-query.service';
import { SearchCoursesUseCase } from './search-courses.use-case';

describe('SearchCoursesUseCase', () => {
  it('forwards the query to CourseQueryService', async () => {
    const repo = new InMemoryMecCourseRepository();
    repo.seedCourse({ codigoCurso: 1, codigoIes: 1, nome: 'Engenharia' });
    const useCase = new SearchCoursesUseCase(
      new CourseQueryService(stubLogger, repo, new InMemoryMecCache()),
    );

    const result = await useCase.execute('engenharia', 10);

    expect(result).toHaveLength(1);
  });
});
