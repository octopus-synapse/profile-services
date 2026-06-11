/**
 * `ExternalJobSearchPort` impl over the JSearch aggregator on RapidAPI
 * (LinkedIn / Google for Jobs / Indeed listings). Fixed trusted host, so
 * the global `fetch` applies — `SafeFetchPort` is for user-supplied URLs.
 *
 * Billing (verified empirically 2026-06-11): 1 credit per page actually
 * returned; `num_pages` is only a ceiling. The adapter derives
 * `creditsConsumed` from the result count and logs the upstream
 * `x-ratelimit-requests-remaining` header as ground truth so the local
 * Redis counter can be audited against it.
 *
 * Throws domain exceptions on non-OK/timeout; per-entry mapping issues
 * degrade by skipping the row, never by failing the batch.
 */

import type { JobType } from '@prisma/client';
import { z } from 'zod';
import type { LoggerPort } from '@/shared-kernel';
import { JSearchUpstreamException } from '../../../domain/exceptions/external-jobs.exceptions';
import {
  type ExternalJobPosting,
  type ExternalJobSearchParams,
  ExternalJobSearchPort,
  type ExternalJobSearchResult,
} from '../../../domain/ports/external-job-search.port';

const CTX = 'JSearchJobSearchAdapter';
// Multi-page aggregation upstream is slow — this is a batch worker
// budget, not an autocomplete one.
const FETCH_TIMEOUT_MS = 30_000;
const RESULTS_PER_PAGE = 10;
const DESCRIPTION_MAX_CHARS = 5_000;

// `job_employment_types` carries the canonical upstream vocabulary;
// `job_employment_type` (singular) is locale-translated ("Tempo
// integral") and useless for mapping.
const EMPLOYMENT_TYPE_MAP: Record<string, JobType> = {
  FULLTIME: 'FULL_TIME',
  CONTRACTOR: 'CONTRACT',
  PARTTIME: 'PART_TIME',
  INTERN: 'INTERNSHIP',
};

// Tolerate unknown upstream shapes: parse loosely, keep only entries
// with usable id/title/company/applyLink strings.
const ResponseSchema = z
  .object({ data: z.array(z.record(z.string(), z.unknown())).optional() })
  .passthrough();

export class JSearchJobSearchAdapter extends ExternalJobSearchPort {
  constructor(
    private readonly apiKey: string,
    private readonly apiHost: string,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async search(params: ExternalJobSearchParams): Promise<ExternalJobSearchResult> {
    const url = new URL(`https://${this.apiHost}/search`);
    url.searchParams.set('query', params.query);
    url.searchParams.set('page', '1');
    url.searchParams.set('num_pages', String(params.numPages));
    url.searchParams.set('country', params.country);
    url.searchParams.set('date_posted', params.datePosted);
    if (params.employmentTypes.length > 0) {
      url.searchParams.set('employment_types', params.employmentTypes.join(','));
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.apiHost,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      throw new JSearchUpstreamException('timeout');
    }

    const quotaRemaining = response.headers.get('x-ratelimit-requests-remaining');
    if (!response.ok) {
      this.logger.warn(
        `JSearch responded ${response.status} (quota remaining: ${quotaRemaining ?? '?'})`,
        CTX,
      );
      throw new JSearchUpstreamException(response.status);
    }

    const parsed = ResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      this.logger.warn('JSearch response did not match the expected shape', CTX);
      return { postings: [], creditsConsumed: 1 };
    }

    const entries = parsed.data.data ?? [];
    const postings: ExternalJobPosting[] = [];
    for (const entry of entries) {
      const posting = mapEntry(entry);
      if (posting) postings.push(posting);
    }

    // 1 credit per page actually returned; an empty response still
    // bills the first page.
    const creditsConsumed = Math.max(1, Math.ceil(entries.length / RESULTS_PER_PAGE));
    this.logger.log(
      `JSearch '${params.query}': ${entries.length} results (${postings.length} usable), ` +
        `${creditsConsumed} credits, upstream remaining: ${quotaRemaining ?? '?'}`,
      CTX,
    );
    return { postings, creditsConsumed };
  }
}

function mapEntry(entry: Record<string, unknown>): ExternalJobPosting | null {
  const externalId = asNonEmptyString(entry.job_id);
  const title = asNonEmptyString(entry.job_title);
  const company = asNonEmptyString(entry.employer_name);
  const applyUrl = asNonEmptyString(entry.job_apply_link);
  if (!externalId || !title || !company || !applyUrl) return null;

  const city = asNonEmptyString(entry.job_city);
  const state = asNonEmptyString(entry.job_state);
  const location =
    asNonEmptyString(entry.job_location) ?? [city, state].filter(Boolean).join(', ') ?? null;

  const description = asNonEmptyString(entry.job_description);
  const { job_description: _omitted, ...rawWithoutDescription } = entry;

  return {
    externalId,
    title,
    company,
    location: location || null,
    isRemote: entry.job_is_remote === true,
    employmentType: mapEmploymentType(entry.job_employment_types),
    applyUrl,
    publisher: asNonEmptyString(entry.job_publisher) ?? null,
    description: description ? description.slice(0, DESCRIPTION_MAX_CHARS) : null,
    postedAt: parseUtcDate(entry.job_posted_at_datetime_utc),
    raw: rawWithoutDescription,
  };
}

function mapEmploymentType(value: unknown): JobType | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    if (typeof item === 'string' && EMPLOYMENT_TYPE_MAP[item]) return EMPLOYMENT_TYPE_MAP[item];
  }
  return null;
}

function parseUtcDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}
