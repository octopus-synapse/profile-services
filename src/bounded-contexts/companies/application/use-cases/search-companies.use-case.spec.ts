import { describe, expect, it } from 'bun:test';
import { InMemoryCacheAdapter } from '@/infrastructure/elysia-adapter/in-memory-cache.adapter';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryCompanySearch } from '../../testing/in-memory-company-search';
import { SearchCompaniesUseCase } from './search-companies.use-case';

function setup() {
  const search = new InMemoryCompanySearch();
  const cache = new InMemoryCacheAdapter();
  const useCase = new SearchCompaniesUseCase(search, cache, stubLogger);
  return { search, cache, useCase };
}

describe('SearchCompaniesUseCase', () => {
  it('returns provider suggestions and clamps to the requested limit', async () => {
    const { search, useCase } = setup();
    search.seed(
      { name: 'Nubank', domain: 'nubank.com.br' },
      { name: 'Nubank Colombia', domain: 'nu.com.co' },
    );

    const result = await useCase.execute({ q: 'nubank', limit: 1 });

    expect(result).toEqual([{ name: 'Nubank', domain: 'nubank.com.br' }]);
    expect(search.calls).toEqual([{ query: 'nubank', limit: 1 }]);
  });

  it('serves repeat queries from cache instead of the provider', async () => {
    const { search, useCase } = setup();
    search.seed({ name: 'Google', domain: 'google.com' });

    await useCase.execute({ q: 'google' });
    await useCase.execute({ q: 'google' });

    expect(search.calls).toHaveLength(1);
  });

  it('normalizes the query for the cache key and the provider', async () => {
    const { search, useCase } = setup();
    search.seed({ name: 'Google', domain: 'google.com' });

    await useCase.execute({ q: '  GoO gle ' });
    await useCase.execute({ q: 'goo gle' });

    expect(search.calls).toEqual([{ query: 'goo gle', limit: 20 }]);
  });

  it('degrades a provider failure to an empty list without caching it', async () => {
    const { search, useCase } = setup();
    search.seed({ name: 'Stripe', domain: 'stripe.com' });
    search.failWith = new Error('logo.dev search responded 503');

    expect(await useCase.execute({ q: 'stripe' })).toEqual([]);

    // Recovery on the next call proves the failure was not cached.
    search.failWith = null;
    expect(await useCase.execute({ q: 'stripe' })).toEqual([
      { name: 'Stripe', domain: 'stripe.com' },
    ]);
  });
});
