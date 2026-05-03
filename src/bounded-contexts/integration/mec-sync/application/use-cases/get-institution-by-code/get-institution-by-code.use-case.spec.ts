import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecInstitutionRepository } from '../../../testing/in-memory-mec.repository';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
import { InstitutionQueryService } from '../../services/institution-query.service';
import { GetInstitutionByCodeUseCase } from './get-institution-by-code.use-case';

describe('GetInstitutionByCodeUseCase', () => {
  it('returns the institution when the code is found', async () => {
    const repo = new InMemoryMecInstitutionRepository();
    repo.seedInstitution({ codigoIes: 1, nome: 'UFRJ' });
    const useCase = new GetInstitutionByCodeUseCase(
      new InstitutionQueryService(stubLogger, repo, new InMemoryMecCache()),
    );

    const result = await useCase.execute(1);
    expect(result?.codigoIes).toBe(1);
  });

  it('returns null for unknown codes', async () => {
    const useCase = new GetInstitutionByCodeUseCase(
      new InstitutionQueryService(
        stubLogger,
        new InMemoryMecInstitutionRepository(),
        new InMemoryMecCache(),
      ),
    );
    expect(await useCase.execute(999)).toBeNull();
  });
});
