/**
 * Analytics Bounded Context Exceptions
 *
 * Covers resume view tracking, platform events, share analytics, and
 * search history.
 */
import {
  DomainException,
  ForbiddenException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class AnalyticsConsentRequiredException extends DomainException {
  readonly code: string = 'ANALYTICS_CONSENT_REQUIRED';
  readonly statusHint = 403;
  constructor() {
    super('User has not granted analytics consent');
  }
}

export class InvalidDateRangeException extends ValidationException {
  override readonly code: string = 'INVALID_DATE_RANGE';
  constructor() {
    super('End date must be after start date');
  }
}

export class DateRangeTooLargeException extends ValidationException {
  override readonly code: string = 'DATE_RANGE_TOO_LARGE';
  constructor(maxDays: number) {
    super(`Date range exceeds maximum of ${maxDays} days`);
  }
}

export class AggregationBackendUnavailableException extends DomainException {
  readonly code: string = 'AGGREGATION_BACKEND_UNAVAILABLE';
  readonly statusHint = 503;
  constructor() {
    super('Analytics backend is temporarily unavailable');
  }
}

export class ShareAnalyticsNotAuthorizedException extends ForbiddenException {
  override readonly code: string = 'SHARE_ANALYTICS_NOT_AUTHORIZED';
  constructor() {
    super('Not authorized');
  }
}
