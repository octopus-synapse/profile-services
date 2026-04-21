/**
 * Platform Bounded Context Exceptions
 *
 * Covers cross-cutting platform concerns: rate-limiting, storage uploads,
 * cache misses, audit failures. Each carries a stable code so the envelope
 * is localizable.
 */
import { DomainException, LimitExceededException } from '@/shared-kernel/exceptions';

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

export class MetricsNotConfiguredException extends DomainException {
  readonly code: string = 'METRICS_NOT_CONFIGURED';
  readonly statusHint = 503;
  constructor() {
    super('Metrics endpoint is not configured');
  }
}

export class InvalidMetricsApiKeyException extends DomainException {
  readonly code: string = 'INVALID_METRICS_API_KEY';
  readonly statusHint = 403;
  constructor() {
    super('Invalid metrics API key');
  }
}
