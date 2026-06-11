import { describe, expect, it } from 'bun:test';
import {
  buildExternalJobPosting,
  InMemoryExternalJobListingsRepository,
  InMemoryExternalJobSearch,
} from '../../testing';
import { buildDedupHash, ExternalJobsIngestionService } from './external-jobs-ingestion.service';
import { JSearchQuotaService } from './jsearch-quota.service';

// A Wednesday in São Paulo (12:00 UTC) — rotation slot must be 'qa'.
const WEDNESDAY = new Date('2026-06-10T12:00:00.000Z');

const noopLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  verbose: () => {},
  // biome-ignore lint/suspicious/noExplicitAny: minimal LoggerPort stub
} as any;

function makeQuota(initialUsed = 0) {
  const store = new Map<string, number>();
  const cache = {
    get: async <T>(key: string) => (store.has(key) ? (store.get(key) as T) : null),
    incrWithTtl: async (key: string) => {
      const next = (store.get(key) ?? 0) + 1;
      store.set(key, next);
      return next;
    },
    // biome-ignore lint/suspicious/noExplicitAny: only the surface the service touches
  } as any;
  const quota = new JSearchQuotaService(cache);
  if (initialUsed > 0) {
    // Pre-fill the month counter without knowing the key format.
    const fill = async () => {
      for (let i = 0; i < initialUsed; i++) await quota.recordCredits(1);
    };
    return { quota, ready: fill() };
  }
  return { quota, ready: Promise.resolve() };
}

function makeService(opts: { initialUsed?: number } = {}) {
  const search = new InMemoryExternalJobSearch();
  const repo = new InMemoryExternalJobListingsRepository();
  const { quota, ready } = makeQuota(opts.initialUsed ?? 0);
  const service = new ExternalJobsIngestionService(
    search,
    repo,
    quota,
    noopLogger,
    async () => {}, // no real sleep in tests
  );
  return { search, repo, quota, service, ready };
}

describe('ExternalJobsIngestionService', () => {
  it('runs the two anchors plus the weekday rotation slot', async () => {
    const { search, service } = makeService();

    const summary = await service.run(WEDNESDAY);

    expect(search.calls.map((c) => c.query)).toEqual(['desenvolvedor', 'software engineer', 'qa']);
    // All calls carry the fixed BR/tech parameters.
    for (const call of search.calls) {
      expect(call.country).toBe('br');
      expect(call.datePosted).toBe('today');
      expect(call.numPages).toBe(2);
      expect(call.employmentTypes).toEqual(['FULLTIME', 'CONTRACTOR', 'INTERN']);
    }
    expect(summary.queries.length).toBe(3);
    expect(summary.stoppedByQuota).toBe(false);
  });

  it('rotates the third slot by São Paulo weekday', async () => {
    const { search, service } = makeService();
    // Saturday 01:00 UTC = Friday 22:00 in São Paulo → 'desenvolvedor frontend'.
    await service.run(new Date('2026-06-13T01:00:00.000Z'));
    expect(search.calls[2]?.query).toBe('desenvolvedor frontend');
  });

  it('persists postings with dedup hash and counts outcomes', async () => {
    const { search, repo, service } = makeService();
    const posting = buildExternalJobPosting({ externalId: 'x1', title: 'Dev Júnior' });
    const samePostingOtherPublisher = buildExternalJobPosting({
      externalId: 'x2',
      title: 'Dev  júnior ', // same after normalization
    });
    search.seed('desenvolvedor', [posting, samePostingOtherPublisher]);

    const summary = await service.run(WEDNESDAY);

    expect(repo.rows.length).toBe(1);
    expect(repo.rows[0]?.dedupHash).toBe(buildDedupHash('Dev Júnior', 'Acme Ltda'));
    expect(repo.rows[0]?.sourceQuery).toBe('desenvolvedor');
    const report = summary.queries.find((q) => q.query === 'desenvolvedor');
    expect(report?.created).toBe(1);
    expect(report?.duplicates).toBe(1);
  });

  it('retries a failed query once and keeps the others running', async () => {
    const { search, service } = makeService();
    search.failTimes = 1; // first call fails, retry succeeds

    const summary = await service.run(WEDNESDAY);

    // 3 queries + 1 retry = 4 upstream calls.
    expect(search.calls.length).toBe(4);
    expect(summary.queries.every((q) => !q.failed)).toBe(true);
  });

  it('marks the query failed after two attempts without aborting the batch', async () => {
    const { search, service } = makeService();
    search.failTimes = 2; // first query fails twice

    const summary = await service.run(WEDNESDAY);

    expect(summary.queries[0]?.failed).toBe(true);
    expect(summary.queries.slice(1).every((q) => !q.failed)).toBe(true);
    // Failed attempts still record worst-case credits (2 per attempt).
    expect(summary.quotaUsedThisMonth).toBeGreaterThanOrEqual(4);
  });

  it('stops the run when the quota ceiling is hit mid-batch', async () => {
    const { service, ready } = makeService({ initialUsed: 179 });
    await ready;

    const summary = await service.run(WEDNESDAY);

    // 179 + 2 > 180 — first assertBudget already refuses.
    expect(summary.queries.length).toBe(0);
    expect(summary.stoppedByQuota).toBe(true);
  });

  it('sweeps rows older than 30 days', async () => {
    const { repo, service } = makeService();
    await repo.upsertByExternalId(
      buildExternalJobPosting({ externalId: 'old' }),
      'old|acme',
      'seed',
      new Date('2026-04-01T00:00:00.000Z'),
    );
    await repo.upsertByExternalId(
      buildExternalJobPosting({ externalId: 'fresh', title: 'Outro' }),
      'outro|acme',
      'seed',
      new Date('2026-06-09T00:00:00.000Z'),
    );

    const summary = await service.run(WEDNESDAY);

    expect(summary.retentionDeleted).toBe(1);
    expect(repo.rows.map((r) => r.externalId)).toEqual(['fresh']);
  });
});

describe('buildDedupHash', () => {
  it('normalizes case, accents and whitespace', () => {
    expect(buildDedupHash('Desenvolvedor  Sênior', 'ACME Ltda')).toBe(
      'desenvolvedor senior|acme ltda',
    );
  });
});
