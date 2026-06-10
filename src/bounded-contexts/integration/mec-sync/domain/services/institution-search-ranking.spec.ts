import { describe, expect, it } from 'bun:test';
import {
  INSTITUTION_SEARCH_TIERS,
  type SearchableInstitution,
  scoreInstitution,
  tokenizeInstitutionQuery,
} from './institution-search-ranking';

const inst = (overrides: Partial<SearchableInstitution>): SearchableInstitution => ({
  nome: 'Universidade Exemplo',
  sigla: null,
  uf: 'SP',
  municipio: null,
  organizacao: null,
  ...overrides,
});

describe('tokenizeInstitutionQuery', () => {
  it('splits on whitespace, lowercases and drops empty tokens', () => {
    expect(tokenizeInstitutionQuery('  FATEC  São   Caetano ')).toEqual([
      'fatec',
      'são',
      'caetano',
    ]);
  });
});

describe('scoreInstitution — tier order', () => {
  const T = INSTITUTION_SEARCH_TIERS;

  it('ranks exact sigla above a name prefix', () => {
    const usp = inst({ nome: 'Universidade de São Paulo', sigla: 'USP' });
    const uspina = inst({ nome: 'Uspina Faculdade' });
    expect(scoreInstitution(usp, ['usp'])).toBe(T.SIGLA_EXACT);
    expect(scoreInstitution(uspina, ['usp'])).toBe(T.NOME_PREFIX);
  });

  it('ranks name prefix above name substring', () => {
    const prefix = inst({ nome: 'Mackenzie Presbiteriana' });
    const contains = inst({ nome: 'Universidade Mackenzie' });
    expect(scoreInstitution(prefix, ['mack'])).toBe(T.NOME_PREFIX);
    expect(scoreInstitution(contains, ['mack'])).toBe(T.NOME_CONTAINS);
  });

  it('ranks name substring above partial sigla, município, uf and organização', () => {
    expect(scoreInstitution(inst({ sigla: 'FATEC-SP' }), ['fatec'])).toBe(T.SIGLA_CONTAINS);
    expect(scoreInstitution(inst({ municipio: 'Santo André' }), ['santo'])).toBe(
      T.MUNICIPIO_CONTAINS,
    );
    expect(scoreInstitution(inst({ uf: 'RJ' }), ['rj'])).toBe(T.UF_EXACT);
    expect(scoreInstitution(inst({ organizacao: 'Centro Universitário' }), ['centro'])).toBe(
      T.ORGANIZACAO_CONTAINS,
    );
    expect(T.NOME_CONTAINS).toBeGreaterThan(T.SIGLA_CONTAINS);
    expect(T.SIGLA_CONTAINS).toBeGreaterThan(T.MUNICIPIO_CONTAINS);
    expect(T.MUNICIPIO_CONTAINS).toBeGreaterThan(T.UF_EXACT);
    expect(T.UF_EXACT).toBeGreaterThan(T.ORGANIZACAO_CONTAINS);
  });

  it('never matches uf as a substring', () => {
    // "sp" appears inside the name but uf is RJ — only the nome tier hits.
    const row = inst({ nome: 'Faculdade Espírito Santo', uf: 'RJ' });
    expect(scoreInstitution(row, ['sp'])).toBe(T.NOME_CONTAINS);
    // No field contains "sp" at all → excluded.
    expect(scoreInstitution(inst({ nome: 'Faculdade do Rio', uf: 'RJ' }), ['sp'])).toBeNull();
  });

  it('matches ignoring accents on both sides', () => {
    const row = inst({ nome: 'Universidade de São Caetano' });
    expect(scoreInstitution(row, ['sao'])).toBe(T.NOME_CONTAINS);
    expect(scoreInstitution(inst({ nome: 'Faculdade Sao Jose' }), ['sãO'])).toBe(T.NOME_CONTAINS);
  });
});

describe('scoreInstitution — AND across tokens', () => {
  const T = INSTITUTION_SEARCH_TIERS;

  it('lets each token hit a different field and sums the tiers', () => {
    const fatec = inst({
      nome: 'Faculdade de Tecnologia de São Caetano do Sul',
      sigla: 'FATEC',
      municipio: 'São Caetano do Sul',
    });
    expect(scoreInstitution(fatec, tokenizeInstitutionQuery('fatec são caetano'))).toBe(
      T.SIGLA_EXACT + T.NOME_CONTAINS + T.NOME_CONTAINS,
    );
  });

  it('excludes the row when any token matches nothing', () => {
    const row = inst({ nome: 'Universidade de São Paulo', sigla: 'USP' });
    expect(scoreInstitution(row, ['usp', 'curitiba'])).toBeNull();
  });
});
