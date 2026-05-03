import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecCourseRepository } from '../../../testing/in-memory-mec.repository';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
import { CourseQueryService } from '../../services/course-query.service';
import { ListKnowledgeAreasUseCase } from './list-knowledge-areas.use-case';

describe('ListKnowledgeAreasUseCase', () => {
  it('returns distinct knowledge areas', async () => {
    const repo = new InMemoryMecCourseRepository();
    repo.seedCourse({ codigoCurso: 1, codigoIes: 1, nome: 'A', areaConhecimento: 'Engenharias' });
    repo.seedCourse({ codigoCurso: 2, codigoIes: 1, nome: 'B', areaConhecimento: 'Saúde' });
    repo.seedCourse({ codigoCurso: 3, codigoIes: 1, nome: 'C', areaConhecimento: 'Engenharias' });

    const useCase = new ListKnowledgeAreasUseCase(
      new CourseQueryService(stubLogger, repo, new InMemoryMecCache()),
    );

    expect((await useCase.execute()).sort()).toEqual(['Engenharias', 'Saúde']);
  });
});
