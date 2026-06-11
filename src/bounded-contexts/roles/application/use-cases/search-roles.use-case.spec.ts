import { describe, expect, it } from 'bun:test';
import type { RoleTitleItem } from '../../roles.routes.schemas';
import { InMemoryRoleSearch } from '../../testing/in-memory-role-search';
import { SearchRolesUseCase } from './search-roles.use-case';

const title = (
  label: string,
  lang: RoleTitleItem['lang'],
  overrides: Partial<RoleTitleItem> = {},
): RoleTitleItem => ({
  label,
  lang,
  source: lang === 'PT' ? 'CBO' : 'ONET',
  isPreferred: false,
  ...overrides,
});

const build = (...titles: RoleTitleItem[]) => {
  const search = new InMemoryRoleSearch();
  search.seed(...titles);
  return { search, useCase: new SearchRolesUseCase(search) };
};

describe('SearchRolesUseCase', () => {
  it('returns ranked matches in the requested language', async () => {
    const { useCase } = build(
      title('Engenheiro de software', 'PT', { source: 'ESCO', isPreferred: true }),
      title('Engenheiro de software embarcado', 'PT'),
      title('Software engineer', 'EN'),
    );
    const items = await useCase.execute({ q: 'engenheiro de software', lang: 'PT' });
    expect(items.map((i) => i.label)).toEqual([
      'Engenheiro de software',
      'Engenheiro de software embarcado',
    ]);
  });

  it('defaults to pt and tops the list up with the other language', async () => {
    const { useCase } = build(
      title('Desenvolvedor full stack', 'PT'),
      title('Full stack developer', 'EN'),
    );
    const items = await useCase.execute({ q: 'full stack' });
    expect(items.map((i) => i.label)).toEqual(['Desenvolvedor full stack', 'Full stack developer']);
  });

  it('does not duplicate a title present in both dictionaries', async () => {
    const { useCase } = build(
      title('Scrum Master', 'PT'),
      title('Scrum master', 'EN'),
      title('Scrum coach', 'EN'),
    );
    const items = await useCase.execute({ q: 'scrum', lang: 'PT' });
    expect(items.map((i) => i.label)).toEqual(['Scrum Master', 'Scrum coach']);
  });

  it('skips the fallback query when the primary language fills the limit', async () => {
    const { search, useCase } = build(
      title('Designer gráfico', 'PT'),
      title('Designer de produto', 'PT'),
      title('Product designer', 'EN'),
    );
    const items = await useCase.execute({ q: 'designer', lang: 'PT', limit: 2 });
    expect(items).toHaveLength(2);
    expect(search.calls).toHaveLength(1);
  });

  it('clamps the fallback to the remaining slots', async () => {
    const { search, useCase } = build(
      title('Analista de marketing', 'PT'),
      title('Marketing analyst', 'EN'),
      title('Marketing manager', 'EN'),
    );
    const items = await useCase.execute({ q: 'marketing', lang: 'PT', limit: 2 });
    expect(items.map((i) => i.lang)).toEqual(['PT', 'EN']);
    expect(search.calls[1]?.limit).toBe(1);
  });

  it('returns empty for an all-whitespace query', async () => {
    const { search, useCase } = build(title('Engenheiro civil', 'PT'));
    expect(await useCase.execute({ q: '  ' })).toEqual([]);
    expect(search.calls).toHaveLength(0);
  });
});
