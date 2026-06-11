/**
 * Monthly credit accounting for the JSearch free plan (200 req/month,
 * hard-limited upstream). The batch worker stops at `BATCH_CREDIT_CEILING`
 * so a dev/testing reserve always survives the month.
 *
 * Counter key: `jsearch:quota:YYYY-MM` (month boundary in São Paulo —
 * same timezone the ingestion cron fires in). The TTL is garbage
 * collection only; correctness comes from the key embedding the month.
 *
 * Race-safety: read-then-check in `assertBudget` is fine because the
 * only writer is the ingestion worker, which runs behind a distributed
 * lock (`runGuardedJob`).
 */

import type { CachePort } from '@/shared-kernel/cache/cache.port';
import { JSearchQuotaExceededException } from '../../domain/exceptions/external-jobs.exceptions';

const QUOTA_TIMEZONE = 'America/Sao_Paulo';
// Free plan is 200/month; 180 caps the batch, 20 stay reserved for
// manual dev calls (RapidAPI enforces the absolute 200 upstream).
export const JSEARCH_BATCH_CREDIT_CEILING = 180;
// GC window for the counter key — outlives the month it tracks.
const QUOTA_KEY_GC_SECONDS = 40 * 24 * 60 * 60;

export class JSearchQuotaService {
  constructor(private readonly cache: CachePort) {}

  /**
   * Throws `JSearchQuotaExceededException` when spending `credits` would
   * push the month past the batch ceiling.
   */
  async assertBudget(credits: number): Promise<void> {
    const used = await this.currentUsage();
    if (used + credits > JSEARCH_BATCH_CREDIT_CEILING) {
      throw new JSearchQuotaExceededException(used, JSEARCH_BATCH_CREDIT_CEILING);
    }
  }

  /** Records credits actually consumed; returns the new monthly total. */
  async recordCredits(credits: number): Promise<number> {
    let total = 0;
    for (let i = 0; i < credits; i++) {
      total = await this.cache.incrWithTtl(this.monthKey(), QUOTA_KEY_GC_SECONDS);
    }
    return total;
  }

  async currentUsage(): Promise<number> {
    return (await this.cache.get<number>(this.monthKey())) ?? 0;
  }

  private monthKey(): string {
    // en-CA renders YYYY-MM-DD; slice to the month.
    const month = new Intl.DateTimeFormat('en-CA', {
      timeZone: QUOTA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
    }).format(new Date());
    return `jsearch:quota:${month}`;
  }
}
