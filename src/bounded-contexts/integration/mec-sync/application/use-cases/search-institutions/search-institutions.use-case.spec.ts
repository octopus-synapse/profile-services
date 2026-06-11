import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecInstitutionRepository } from '../../../testing/in-memory-mec.repository';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
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

  it('orders results by relevance: exact sigla, then name prefix, then city', async () => {
    const repo = new InMemoryMecInstitutionRepository();
    repo.seedInstitution({
      codigoIes: 1,
      nome: 'Faculdade de Santo André',
      municipio: 'Santo André',
    });
    repo.seedInstitution({ codigoIes: 2, nome: 'Uspina Faculdade', municipio: 'Curitiba' });
    repo.seedInstitution({
      codigoIes: 3,
      nome: 'Universidade de São Paulo',
      sigla: 'USP',
      municipio: 'São Paulo',
    });
    repo.seedInstitution({
      codigoIes: 4,
      nome: 'Centro Universitário Uspal',
      municipio: 'Uspolândia',
    });
    const useCase = new SearchInstitutionsUseCase(
      new InstitutionQueryService(stubLogger, repo, new InMemoryMecCache()),
    );

    const results = await useCase.execute('usp', 10);

    expect(results.map((r) => r.codigoIes)).toEqual([3, 2, 4]);
  });

  it('combines tokens across fields (sigla + city)', async () => {
    const repo = new InMemoryMecInstitutionRepository();
    repo.seedInstitution({
      codigoIes: 1,
      nome: 'Faculdade de Tecnologia de São Caetano do Sul',
      sigla: 'FATEC',
      municipio: 'São Caetano do Sul',
    });
    repo.seedInstitution({
      codigoIes: 2,
      nome: 'Faculdade de Tecnologia de Sorocaba',
      sigla: 'FATEC',
    });
    const useCase = new SearchInstitutionsUseCase(
      new InstitutionQueryService(stubLogger, repo, new InMemoryMecCache()),
    );

    const results = await useCase.execute('fatec caetano', 10);

    expect(results.map((r) => r.codigoIes)).toEqual([1]);
  });
});
