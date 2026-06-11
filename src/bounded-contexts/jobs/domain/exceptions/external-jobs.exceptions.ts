/**
 * External job ingestion (JSearch / RapidAPI) exceptions.
 *
 * Kept apart from jobs.exceptions.ts: these belong to the external-listings
 * vertical (daily batch ingestion + read route), not the recruiter-owned
 * Job aggregate.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class JSearchNotConfiguredException extends DomainException {
  readonly code: string = 'JSEARCH_NOT_CONFIGURED';
  readonly statusHint = 503;
  constructor() {
    super('External job search is not configured (missing RapidAPI key/host)');
  }
}

/**
 * Raised by the quota guard before an upstream call would push the
 * monthly credit counter past the batch ceiling. The free RapidAPI plan
 * hard-limits at 200 requests/month; the worker stops at 180 so a dev
 * reserve survives.
 */
export class JSearchQuotaExceededException extends DomainException {
  readonly code: string = 'JSEARCH_QUOTA_EXCEEDED';
  readonly statusHint = 429;
  constructor(used: number, ceiling: number) {
    super(`JSearch monthly quota ceiling reached (${used}/${ceiling} credits used)`);
  }
}

export class JSearchUpstreamException extends DomainException {
  readonly code: string = 'JSEARCH_UPSTREAM_FAILED';
  readonly statusHint = 502;
  constructor(status: number | 'timeout') {
    super(`JSearch upstream request failed (${status})`);
  }
}
