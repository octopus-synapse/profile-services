import { describe, expect, it } from 'bun:test';
import { JSearchQuotaExceededException } from '../../domain/exceptions/external-jobs.exceptions';
import { JSEARCH_BATCH_CREDIT_CEILING, JSearchQuotaService } from './jsearch-quota.service';

/** Minimal CachePort stand-in: a map + incr, enough for the counter. */
function makeCache(initial: Record<string, number> = {}) {
  const store = new Map<string, number>(Object.entries(initial));
  return {
    store,
    cache: {
      get: async <T>(key: string) => (store.has(key) ? (store.get(key) as T) : null),
      incrWithTtl: async (key: string) => {
        const next = (store.get(key) ?? 0) + 1;
        store.set(key, next);
        return next;
      },
      // biome-ignore lint/suspicious/noExplicitAny: only the surface the service touches
    } as any,
  };
}

function currentMonthKey(): string {
  const month = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
  return `jsearch:quota:${month}`;
}

describe('JSearchQuotaService', () => {
  it('uses a month-scoped key in São Paulo time', async () => {
    const { store, cache } = makeCache();
    const service = new JSearchQuotaService(cache);

    await service.recordCredits(1);

    expect([...store.keys()]).toEqual([currentMonthKey()]);
    expect(currentMonthKey()).toMatch(/^jsearch:quota:\d{4}-\d{2}$/);
  });

  it('allows spending up to the ceiling boundary, exclusive', async () => {
    const { cache } = makeCache({ [currentMonthKey()]: JSEARCH_BATCH_CREDIT_CEILING - 2 });
    const service = new JSearchQuotaService(cache);

    // 178 + 2 = 180 — exactly at ceiling, allowed.
    expect(service.assertBudget(2)).resolves.toBeUndefined();
    // 178 + 3 = 181 — would cross, refused.
    expect(service.assertBudget(3)).rejects.toThrow(JSearchQuotaExceededException);
  });

  it('refuses any spend once the ceiling is reached', async () => {
    const { cache } = makeCache({ [currentMonthKey()]: JSEARCH_BATCH_CREDIT_CEILING });
    const service = new JSearchQuotaService(cache);

    expect(service.assertBudget(1)).rejects.toThrow(JSearchQuotaExceededException);
  });

  it('recordCredits increments once per credit and returns the running total', async () => {
    const { store, cache } = makeCache();
    const service = new JSearchQuotaService(cache);

    const total = await service.recordCredits(3);

    expect(total).toBe(3);
    expect(store.get(currentMonthKey())).toBe(3);
    expect(await service.currentUsage()).toBe(3);
  });
});
