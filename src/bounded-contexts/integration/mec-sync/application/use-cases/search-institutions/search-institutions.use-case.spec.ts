import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
import { InMemoryMecInstitutionRepository } from '../../../testing/in-memory-mec-repositories';
import { InstitutionQueryService } from '../../services/institution-query.service';
import { SearchInstitutionsUseCase } from './search-institutions.use-case';

describe('SearchInstitutionsUseCase', () => {
  it('returns matching institutions', async () => {
    const repo = new InMemoryMecInstitutionRepository();
    repo.seedInstitution({ codigoIes: 1, nome: 'Universidade Federal' });
    const useCase = new SearchInstitutionsUseCase(
      new InstitutionQueryService(stubLogger, repo, new InMemoryMecCache()),
    );

    expect(await useCase.execute('federal', 5)).toHaveLength(1);
  });
});
