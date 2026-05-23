import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecInstitutionRepository } from '../../../testing/in-memory-mec.repository';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
import { InstitutionQueryService } from '../../services/institution-query.service';
import { ListStateCodesUseCase } from './list-state-codes.use-case';

describe('ListStateCodesUseCase', () => {
  it('returns distinct UFs from active institutions', async () => {
    const repo = new InMemoryMecInstitutionRepository();
    repo.seedInstitution({ codigoIes: 1, nome: 'A', uf: 'SP' });
    repo.seedInstitution({ codigoIes: 2, nome: 'B', uf: 'RJ' });
    repo.seedInstitution({ codigoIes: 3, nome: 'C', uf: 'SP' });

    const useCase = new ListStateCodesUseCase(
      new InstitutionQueryService(stubLogger, repo, new InMemoryMecCache()),
    );

    const result = await useCase.execute();
    expect(result.sort()).toEqual(['RJ', 'SP']);
  });
});
