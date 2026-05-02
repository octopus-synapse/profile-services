/**
 * Platform Bounded Context Exceptions
 *
 * Covers cross-cutting platform concerns: rate-limiting, storage uploads,
 * cache misses, audit failures. Each carries a stable code so the envelope
 * is localizable.
 */
import {
  DomainException,
  LimitExceededException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class RateLimitedException extends LimitExceededException {
  readonly code: string = 'RATE_LIMITED';
  constructor(retryAfterSeconds: number) {
    super('rate', 1, 1);
    (this as unknown as { retryAfterSeconds: number }).retryAfterSeconds = retryAfterSeconds;
  }
}

export class StorageUploadFailedException extends DomainException {
  readonly code: string = 'STORAGE_UPLOAD_FAILED';
  readonly statusHint = 502;
  constructor(reason?: string) {
    super(reason ?? 'Failed to upload file to storage');
  }
}

export class StorageObjectNotFoundException extends DomainException {
  readonly code: string = 'STORAGE_OBJECT_NOT_FOUND';
  readonly statusHint = 404;
  constructor(key: string) {
    super(`Storage object "${key}" not found`);
  }
}

export class StorageConfigurationException extends DomainException {
  readonly code: string = 'STORAGE_NOT_CONFIGURED';
  readonly statusHint = 503;
  constructor() {
    super('Storage backend is not configured');
  }
}

export class AuditLogFailedException extends DomainException {
  readonly code: string = 'AUDIT_LOG_FAILED';
  readonly statusHint = 500;
  constructor(reason: string) {
    super(`Audit log failed: ${reason}`);
  }
}

export class FeatureDisabledException extends DomainException {
  readonly code: string = 'FEATURE_DISABLED';
  readonly statusHint = 403;
  constructor(feature: string) {
    super(`Feature "${feature}" is currently disabled`);
  }
}

export class ConfigurationMissingException extends DomainException {
  readonly code: string = 'CONFIGURATION_MISSING';
  readonly statusHint = 503;
  constructor(key: string) {
    super(`Required configuration "${key}" is missing`);
  }
}

/**
 * F5.I.3 SKIP — owned by `platform/metrics` BC (not part of the
 * `platform/common` lot 2 surface). Throws live in
 * `src/bounded-contexts/platform/metrics/*` and are tracked separately.
 */
export class MetricsNotConfiguredException extends DomainException {
  readonly code: string = 'METRICS_NOT_CONFIGURED';
  readonly statusHint = 503;
  constructor() {
    super('Metrics endpoint is not configured');
  }
}

/**
 * F5.I.3 SKIP — same scope as `MetricsNotConfiguredException`; lives in
 * `platform/metrics`, out of lot 2.
 */
export class InvalidMetricsApiKeyException extends DomainException {
  readonly code: string = 'INVALID_METRICS_API_KEY';
  readonly statusHint = 403;
  constructor() {
    super('Invalid metrics API key');
  }
}

export class InvalidTestSuiteException extends ValidationException {
  readonly code: string = 'INVALID_TEST_SUITE';
  constructor(
    public readonly suite: string,
    public readonly available: readonly string[],
  ) {
    super(`Unknown suite "${suite}". Available: ${available.join(', ')}`);
  }
}

/**
 * F5.I.3 SKIP — owned by `platform/webhooks` BC (out of lot 2 scope).
 * Terminal webhook delivery error — raised inside the retry loop so the outer
 * catch can log it with structured detail. If it ever escapes the retry, the
 * envelope carries a stable code instead of leaking HTTP status text.
 */
export class WebhookDeliveryFailedException extends DomainException {
  readonly code: string = 'WEBHOOK_DELIVERY_FAILED';
  readonly statusHint = 502;
  constructor(
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(`HTTP ${status}: ${statusText}`);
  }
}

/**
 * Repository used before onModuleInit finished. Programmer error — typed so
 * the envelope surfaces a stable code if DI wiring ever regresses in prod.
 */
export class RepositoryNotInitializedException extends DomainException {
  readonly code: string = 'REPOSITORY_NOT_INITIALIZED';
  readonly statusHint = 500;
  constructor(repositoryName: string) {
    super(`${repositoryName} not initialized. Ensure onModuleInit was called.`);
  }
}

/**
 * Parser produced an unrecognized output. Used by external-data parsers that
 * depend on a third-party payload shape (e.g. GitHub Linguist YAML).
 */
export class ExternalDataParseFailedException extends DomainException {
  readonly code: string = 'EXTERNAL_DATA_PARSE_FAILED';
  readonly statusHint = 502;
  constructor(source: string, reason?: string) {
    super(`${source} parse failed${reason ? `: ${reason}` : ''}`);
  }
}
