import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
import { InMemoryMecInstitutionRepository } from '../../../testing/in-memory-mec-repositories';
import { InstitutionQueryService } from '../../services/institution-query.service';
import { ListInstitutionsUseCase } from './list-institutions.use-case';

describe('ListInstitutionsUseCase', () => {
  function build() {
    const repo = new InMemoryMecInstitutionRepository();
    repo.seedInstitution({ codigoIes: 1, nome: 'UFRJ', uf: 'RJ' });
    repo.seedInstitution({ codigoIes: 2, nome: 'USP', uf: 'SP' });
    return new ListInstitutionsUseCase(
      new InstitutionQueryService(stubLogger, repo, new InMemoryMecCache()),
    );
  }

  it('returns all active institutions when no state code is provided', async () => {
    expect(await build().execute()).toHaveLength(2);
  });

  it('filters by state code when provided', async () => {
    const result = await build().execute('SP');
    expect(result).toHaveLength(1);
    expect(result[0].uf).toBe('SP');
  });
});
