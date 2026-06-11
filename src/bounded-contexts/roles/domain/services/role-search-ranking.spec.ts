import { describe, expect, it } from 'bun:test';
import {
  foldRoleText,
  ROLE_SEARCH_TIERS,
  type SearchableRoleTitle,
  scoreRoleTitle,
  tokenizeRoleQuery,
} from './role-search-ranking';

const T = ROLE_SEARCH_TIERS;

const row = (normalizedLabel: string, isPreferred = false): SearchableRoleTitle => ({
  normalizedLabel,
  isPreferred,
});

const score = (label: string, query: string, isPreferred = false): number | null =>
  scoreRoleTitle(
    row(foldRoleText(label), isPreferred),
    tokenizeRoleQuery(query),
    foldRoleText(query),
  );

describe('foldRoleText / tokenizeRoleQuery', () => {
  it('lowercases, strips accents and collapses whitespace', () => {
    expect(foldRoleText('  Engenheiro   de  Produção ')).toBe('engenheiro de producao');
  });

  it('tokenizes the folded query and drops empty tokens', () => {
    expect(tokenizeRoleQuery(' Engenheiro   de SOFTWARE ')).toEqual([
      'engenheiro',
      'de',
      'software',
    ]);
  });
});

describe('scoreRoleTitle — tier order', () => {
  it('ranks a whole-query exact match above everything', () => {
    const exact = score('Engenheiro de software', 'engenheiro de software');
    const prefix = score('Engenheiro de software embarcado', 'engenheiro de software');
    expect(exact).toBeGreaterThan(prefix ?? 0);
  });

  it('ranks label prefix above word prefix above contains', () => {
    expect(score('Designer gráfico', 'design')).toBe(T.LABEL_PREFIX);
    expect(score('Analista de design', 'design')).toBe(T.WORD_PREFIX);
    expect(score('Webdesigner', 'design')).toBe(T.CONTAINS);
  });

  it('boosts preferred labels over synonyms at equal relevance', () => {
    const preferred = score('Engenheiro civil', 'engenheiro', true);
    const synonym = score('Engenheiro civil', 'engenheiro', false);
    expect(preferred).toBe((synonym ?? 0) + T.PREFERRED_BOOST);
  });

  it('matches ignoring accents on both sides', () => {
    expect(score('Engenheiro de produção', 'producao')).toBe(T.WORD_PREFIX);
    expect(score('Tecnico em informatica', 'técnico')).toBe(T.LABEL_PREFIX);
  });
});

describe('scoreRoleTitle — AND across tokens', () => {
  it('sums the strongest tier per token', () => {
    // "engenheiro" is a label prefix; "software" starts a later word.
    expect(score('Engenheiro de software', 'engenheiro software')).toBe(
      T.LABEL_PREFIX + T.WORD_PREFIX,
    );
  });

  it('excludes the row when any token matches nothing', () => {
    expect(score('Engenheiro de software', 'engenheiro civil')).toBeNull();
  });
});
