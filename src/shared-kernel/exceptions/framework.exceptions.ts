/**
 * Framework-level exceptions raised by the HTTP pipeline / shared
 * validation primitives. Each carries a stable `code` so the i18n
 * dictionary can translate them in both locales without leaking
 * framework specifics into the wire format.
 *
 * These are intentionally NOT scoped to a single BC — they're the
 * shared surface every BC's routes/handlers can throw when validating
 * the path/body/query/headers shape itself.
 */

import type { ErrorSeverity } from '@/bounded-contexts/platform/i18n/domain/error-envelope';
import { DomainException, ValidationException } from './domain.exceptions';

/** 404 fallback when the router can't resolve the requested path. */
export class RouteNotFoundException extends DomainException {
  readonly code: string = 'ROUTE_NOT_FOUND';
  readonly statusHint = 404;
  override readonly severity: ErrorSeverity = 'inline';
  constructor(public readonly path: string) {
    super(`Route ${path} not found`);
  }
}

/** Body parser couldn't parse the request as JSON. */
export class InvalidJsonBodyException extends ValidationException {
  readonly code: string = 'INVALID_JSON_BODY';
  constructor(detail?: string) {
    super(detail ? `Invalid JSON body: ${detail}` : 'Invalid JSON body');
  }
}

/** Identifier param required by the route was missing/empty. */
export class IdRequiredException extends ValidationException {
  readonly code: string = 'ID_REQUIRED';
  constructor(public readonly paramName: string = 'id') {
    super(`${paramName} is required`);
  }
}

/** Identifier param had the wrong shape (e.g. cuid expected, got plain string). */
export class InvalidIdFormatException extends ValidationException {
  readonly code: string = 'INVALID_ID_FORMAT';
  constructor(
    public readonly paramName: string,
    public readonly expected: string,
  ) {
    super(`${paramName} has invalid format (expected ${expected})`);
  }
}

/** i18n enum lookup miss — the catalog has no translation for the key. */
export class UnknownEnumException extends ValidationException {
  readonly code: string = 'UNKNOWN_ENUM';
  constructor(
    public readonly enumName: string,
    public readonly key: string,
  ) {
    super(`Unknown ${enumName} value: ${key}`);
  }
}
