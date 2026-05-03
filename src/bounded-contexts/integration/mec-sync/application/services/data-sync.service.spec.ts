import { describe, expect, it, mock } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InMemoryMecCourseRepository,
  InMemoryMecInstitutionRepository,
} from '../../testing/in-memory-mec.repository';
import { InMemoryMecCache } from '../../testing/in-memory-mec-cache';
import { DataSyncService } from './data-sync.service';
import type { ParseResult } from './mec-csv-parser.service';

describe('DataSyncService', () => {
  it('inserts new institutions and courses in bulk', async () => {
    const institutionRepo = new InMemoryMecInstitutionRepository();
    const courseRepo = new InMemoryMecCourseRepository();
    const cache = new InMemoryMecCache();
    const service = new DataSyncService(stubLogger, cache, institutionRepo, courseRepo);

    const parseResult: ParseResult = {
      institutions: new Map([
        [
          1,
          {
            codigoIes: 1,
            nome: 'Universidade Federal',
            sigla: 'UFRJ',
            organizacao: 'Universidade',
            categoria: 'Pública Federal',
            uf: 'RJ',
            municipio: 'Rio de Janeiro',
            codigoMunicipio: 3304557,
          },
        ],
      ]),
      courses: [
        {
          codigoCurso: 100,
          codigoIes: 1,
          nome: 'Ciência da Computação',
          grau: 'Bacharelado',
          modalidade: 'Presencial',
          areaConhecimento: 'Computação',
          cargaHoraria: 3200,
          situacao: 'Em atividade',
        },
      ],
      errors: [],
      totalRows: 1,
      fileSize: 1024,
    };

    const inst = await service.syncInstitutions(parseResult);
    const courses = await service.syncCourses(parseResult);

    expect(inst.inserted).toBe(1);
    expect(courses.inserted).toBe(1);
  });

  it('invalidates the read-side caches on demand', async () => {
    const cache = new InMemoryMecCache();
    const deleteSpy = mock(() => Promise.resolve());
    const deletePatternSpy = mock(() => Promise.resolve());
    cache.delete = deleteSpy;
    cache.deletePattern = deletePatternSpy;

    const service = new DataSyncService(
      stubLogger,
      cache,
      new InMemoryMecInstitutionRepository(),
      new InMemoryMecCourseRepository(),
    );

    await service.invalidateCaches();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deletePatternSpy).toHaveBeenCalledTimes(3);
  });
});
