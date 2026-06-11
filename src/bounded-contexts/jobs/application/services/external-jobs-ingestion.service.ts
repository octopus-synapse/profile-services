/**
 * Daily JSearch ingestion batch: 3 fixed-budget queries (tech, Brazil),
 * upsert into `ExternalJobListing`, 30-day retention sweep, structured
 * per-query + summary logging.
 *
 * Budget invariant: worst case is `QUERIES × NUM_PAGES` credits/day
 * (1 credit per page actually returned upstream); `JSearchQuotaService`
 * hard-stops the month at 180 so even a retry storm can't eat the
 * RapidAPI free plan.
 *
 * Queries are independent: one failing (after a single retry) never
 * aborts the others. A quota stop, however, breaks the whole run —
 * tomorrow's cycle picks up.
 */

import type { LoggerPort } from '@/shared-kernel';
import { JSearchQuotaExceededException } from '../../domain/exceptions/external-jobs.exceptions';
import type { ExternalJobListingsRepositoryPort } from '../../domain/ports/external-job-listings.repository.port';
import type {
  ExternalJobSearchPort,
  ExternalJobSearchResult,
} from '../../domain/ports/external-job-search.port';
import type { JSearchQuotaService } from './jsearch-quota.service';

const CTX = 'ExternalJobsIngestionService';
const COUNTRY = 'br';
const DATE_POSTED = 'today' as const;
// Upstream vocabulary — no PARTTIME: rare in BR tech and deliberately
// excluded (decisão de produto, 2026-06-11).
const EMPLOYMENT_TYPES = ['FULLTIME', 'CONTRACTOR', 'INTERN'] as const;
// Worst-case credit cost per query (1 credit/page returned). BR density
// with date_posted=today rarely fills past page 2 anyway.
const NUM_PAGES = 2;
const RETRY_BACKOFF_MS = 2_000;
const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const INGESTION_TIMEZONE = 'America/Sao_Paulo';

// Two broad anchors + a weekday-rotated specialty slot. Terms are
// single-intent and PT/EN mixed for the Brazilian market.
const ANCHOR_QUERIES = ['desenvolvedor', 'software engineer'] as const;
const WEEKDAY_ROTATION: Record<string, string> = {
  Sun: 'product manager',
  Mon: 'engenheiro de dados',
  Tue: 'devops',
  Wed: 'qa',
  Thu: 'desenvolvedor mobile',
  Fri: 'desenvolvedor frontend',
  Sat: 'desenvolvedor backend',
};

export interface IngestionQueryReport {
  readonly query: string;
  readonly fetched: number;
  readonly created: number;
  readonly updated: number;
  readonly duplicates: number;
  readonly credits: number;
  readonly failed: boolean;
}

export interface IngestionSummary {
  readonly queries: IngestionQueryReport[];
  readonly totalFetched: number;
  readonly totalCreated: number;
  readonly creditsUsed: number;
  readonly quotaUsedThisMonth: number;
  readonly retentionDeleted: number;
  readonly stoppedByQuota: boolean;
}

export class ExternalJobsIngestionService {
  constructor(
    private readonly search: ExternalJobSearchPort,
    private readonly repo: ExternalJobListingsRepositoryPort,
    private readonly quota: JSearchQuotaService,
    private readonly logger: LoggerPort,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  async run(now: Date = new Date()): Promise<IngestionSummary> {
    const reports: IngestionQueryReport[] = [];
    let creditsUsed = 0;
    let stoppedByQuota = false;

    for (const query of [...ANCHOR_QUERIES, rotationQueryFor(now)]) {
      try {
        await this.quota.assertBudget(NUM_PAGES);
      } catch (error) {
        if (error instanceof JSearchQuotaExceededException) {
          this.logger.warn(
            `Quota ceiling reached — skipping remaining queries: ${error.message}`,
            CTX,
          );
          stoppedByQuota = true;
          break;
        }
        throw error;
      }

      const report = await this.runQuery(query, now);
      reports.push(report);
      creditsUsed += report.credits;
    }

    const retentionDeleted = await this.repo.deleteFetchedBefore(
      new Date(now.getTime() - RETENTION_DAYS * DAY_MS),
    );
    const quotaUsedThisMonth = await this.quota.currentUsage();

    const summary: IngestionSummary = {
      queries: reports,
      totalFetched: reports.reduce((acc, r) => acc + r.fetched, 0),
      totalCreated: reports.reduce((acc, r) => acc + r.created, 0),
      creditsUsed,
      quotaUsedThisMonth,
      retentionDeleted,
      stoppedByQuota,
    };
    this.logger.log(
      `Ingestion done: ${summary.totalFetched} fetched, ${summary.totalCreated} new, ` +
        `${creditsUsed} credits (${quotaUsedThisMonth}/month), ${retentionDeleted} expired rows removed` +
        (stoppedByQuota ? ' [stopped by quota]' : ''),
      CTX,
    );
    return summary;
  }

  private async runQuery(query: string, now: Date): Promise<IngestionQueryReport> {
    let result: ExternalJobSearchResult | null = null;
    try {
      result = await this.searchAndRecord(query);
    } catch {
      await this.sleep(RETRY_BACKOFF_MS);
      try {
        await this.quota.assertBudget(NUM_PAGES);
        result = await this.searchAndRecord(query);
      } catch (retryError) {
        this.logger.error(`Query '${query}' failed after retry`, {
          context: CTX,
          stack: retryError instanceof Error ? retryError.stack : undefined,
        });
      }
    }

    if (!result) {
      return { query, fetched: 0, created: 0, updated: 0, duplicates: 0, credits: 0, failed: true };
    }

    let created = 0;
    let updated = 0;
    let duplicates = 0;
    for (const posting of result.postings) {
      const outcome = await this.repo.upsertByExternalId(
        posting,
        buildDedupHash(posting.title, posting.company),
        query,
        now,
      );
      if (outcome === 'created') created++;
      else if (outcome === 'updated') updated++;
      else duplicates++;
    }

    const quotaUsed = await this.quota.currentUsage();
    this.logger.log(
      `Query '${query}': ${result.postings.length} fetched, ${created} new, ${updated} refreshed, ` +
        `${duplicates} dups, ${result.creditsConsumed} credits (${quotaUsed}/month)`,
      CTX,
    );
    return {
      query,
      fetched: result.postings.length,
      created,
      updated,
      duplicates,
      credits: result.creditsConsumed,
      failed: false,
    };
  }

  /**
   * Credits are recorded for every attempt that reached the upstream —
   * a non-OK response still bills pages on RapidAPI's side, so
   * `JSearchUpstreamException` records the worst case before rethrowing.
   */
  private async searchAndRecord(query: string): Promise<ExternalJobSearchResult> {
    try {
      const result = await this.search.search({
        query,
        country: COUNTRY,
        datePosted: DATE_POSTED,
        employmentTypes: EMPLOYMENT_TYPES,
        numPages: NUM_PAGES,
      });
      await this.quota.recordCredits(result.creditsConsumed);
      return result;
    } catch (error) {
      await this.quota.recordCredits(NUM_PAGES);
      throw error;
    }
  }
}

function rotationQueryFor(now: Date): string {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: INGESTION_TIMEZONE,
    weekday: 'short',
  }).format(now);
  return WEEKDAY_ROTATION[weekday] ?? WEEKDAY_ROTATION.Mon;
}

/** Normalized `title|company`: lowercase, accent-stripped, collapsed. */
export function buildDedupHash(title: string, company: string): string {
  return `${normalize(title)}|${normalize(company)}`;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
