import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecCache } from '../../testing/in-memory-mec-cache';
import { InMemoryMecInstitutionRepository } from '../../testing/in-memory-mec-repositories';
import { InstitutionQueryService } from './institution-query.service';

describe('InstitutionQueryService', () => {
  it('returns the cached list on the second call', async () => {
    const cache = new InMemoryMecCache();
    const repo = new InMemoryMecInstitutionRepository();
    repo.seedInstitution({ id: 'i-1', codigoIes: 1, nome: 'UFRJ', uf: 'RJ' });

    const service = new InstitutionQueryService(stubLogger, repo, cache);
    const first = await service.listAllActiveInstitutions();
    repo.seedInstitution({ id: 'i-2', codigoIes: 2, nome: 'UFSP', uf: 'SP' });
    const second = await service.listAllActiveInstitutions();

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1); // came from the cache
  });

  it('skips repository search for queries shorter than 2 characters', async () => {
    const repo = new InMemoryMecInstitutionRepository();
    const service = new InstitutionQueryService(stubLogger, repo, new InMemoryMecCache());

    expect(await service.searchInstitutionsByName('a')).toEqual([]);
  });
});
