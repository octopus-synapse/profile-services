import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecCourseRepository } from '../../testing/in-memory-mec.repository';
import { InMemoryMecCache } from '../../testing/in-memory-mec-cache';
import { CourseQueryService } from './course-query.service';

describe('CourseQueryService', () => {
  it('caches courses per institution code', async () => {
    const cache = new InMemoryMecCache();
    const repo = new InMemoryMecCourseRepository();
    repo.seedCourse({ id: 'c-1', codigoCurso: 100, codigoIes: 1, nome: 'CC', uf: 'RJ' });
    const service = new CourseQueryService(stubLogger, repo, cache);

    const a = await service.listCoursesByInstitutionCode(1);
    const b = await service.listCoursesByInstitutionCode(1);

    expect(a).toEqual(b);
    expect(repo.findCoursesByInstitutionCodeCalls).toBe(1);
  });

  it('skips repository search for queries shorter than 2 characters', async () => {
    const service = new CourseQueryService(
      stubLogger,
      new InMemoryMecCourseRepository(),
      new InMemoryMecCache(),
    );

    expect(await service.searchCoursesByName('a')).toEqual([]);
  });
});
