/**
 * Career Graph Bounded Context Exceptions
 *
 * Covers the input + cohort invariants of the "where are people like me"
 * feature. The use case fans out two repository calls in parallel; failures
 * map to one of these classes so the error envelope stays stable for
 * frontend consumption.
 */
import { DomainException, ValidationException } from '@/shared-kernel/exceptions';

export class CareerGraphStackRequiredException extends ValidationException {
  readonly code: string = 'CAREER_GRAPH_STACK_REQUIRED';
  constructor() {
    super('Career graph requires at least one stack skill to compare cohorts');
  }
}

export class CareerGraphInvalidMaxBucketsException extends ValidationException {
  readonly code: string = 'CAREER_GRAPH_INVALID_MAX_BUCKETS';
  constructor(received: number) {
    super(`maxBuckets must be between 1 and 50 (received ${received})`);
  }
}

export class CareerCohortEmptyException extends DomainException {
  readonly code: string = 'CAREER_COHORT_EMPTY';
  readonly statusHint = 404;
  constructor() {
    super('No peers found matching this stack — try broadening the skills');
  }
}

export class CareerGraphRepositoryUnavailableException extends DomainException {
  readonly code: string = 'CAREER_GRAPH_REPOSITORY_UNAVAILABLE';
  readonly statusHint = 503;
  constructor() {
    super('Career graph data is temporarily unavailable');
  }
}
