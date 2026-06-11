/**
 * In-memory `ExternalJobSearchPort` double. Seed postings, inspect
 * `calls`, and drive failure paths with `failWith` (every call) or
 * `failTimes` (first N calls — exercises the retry-once policy).
 */

import {
  type ExternalJobPosting,
  type ExternalJobSearchParams,
  ExternalJobSearchPort,
  type ExternalJobSearchResult,
} from '../domain/ports/external-job-search.port';

const RESULTS_PER_PAGE = 10;

export class InMemoryExternalJobSearch extends ExternalJobSearchPort {
  readonly calls: ExternalJobSearchParams[] = [];
  failWith: Error | null = null;
  failTimes = 0;
  private postingsByQuery = new Map<string, ExternalJobPosting[]>();

  seed(query: string, postings: ExternalJobPosting[]): void {
    this.postingsByQuery.set(query, postings);
  }

  async search(params: ExternalJobSearchParams): Promise<ExternalJobSearchResult> {
    this.calls.push(params);
    if (this.failTimes > 0) {
      this.failTimes--;
      throw this.failWith ?? new Error('InMemoryExternalJobSearch forced failure');
    }
    if (this.failWith) throw this.failWith;
    const postings = this.postingsByQuery.get(params.query) ?? [];
    return {
      postings,
      creditsConsumed: Math.max(1, Math.ceil(postings.length / RESULTS_PER_PAGE)),
    };
  }
}

/** Convenience builder for a posting with sane defaults. */
export function buildExternalJobPosting(
  overrides: Partial<ExternalJobPosting> = {},
): ExternalJobPosting {
  return {
    externalId: 'job-1',
    title: 'Desenvolvedor Backend',
    company: 'Acme Ltda',
    location: 'São Paulo, SP',
    isRemote: false,
    employmentType: 'FULL_TIME',
    applyUrl: 'https://example.com/apply',
    publisher: 'Indeed',
    description: 'Vaga de backend.',
    postedAt: null,
    raw: {},
    ...overrides,
  };
}
