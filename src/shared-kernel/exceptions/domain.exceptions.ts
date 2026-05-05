/**
 * Domain Exceptions
 *
 * Framework-independent exception classes for use in use-cases.
 * These exceptions represent domain-level errors that can be caught
 * and converted to HTTP responses by the application layer.
 */

import type {
  ErrorSeverity,
  SuggestedAction,
} from '@/bounded-contexts/platform/i18n/domain/error-envelope';

/**
 * Base class for all domain exceptions.
 *
 * Every concrete subclass MUST declare:
 * - `code`: a stable SCREAMING_SNAKE_CASE identifier used as the catalog key.
 * - `statusHint`: the HTTP status the filter should emit when this class
 *   reaches the HTTP boundary unhandled.
 *
 * `severity` and `suggestedAction` carry UX hints to the frontend. The base
 * class supplies safe defaults (`'toast'`, no action) so adding the fields
 * across the codebase is non-breaking; specific subclasses override.
 */
export interface DomainExceptionOptions {
  /**
   * Original error this exception wraps. Preserves the upstream
   * stack and message in the cause chain so logs surface the real
   * fault even when it's been re-thrown as a typed domain exception.
   * Forwarded straight to the native `Error` constructor (ES2022).
   */
  readonly cause?: unknown;
}

export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly statusHint: number;
  readonly severity: ErrorSeverity = 'toast';
  readonly suggestedAction?: SuggestedAction;

  constructor(message: string, options: DomainExceptionOptions = {}) {
    // ES2022 `Error` accepts `{ cause }`; pass through verbatim so
    // `err.cause` is populated on the native Error chain. Subclasses
    // that previously called `super(message)` continue to work because
    // the second arg is optional.
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    // Maintains proper stack trace in V8 environments
    Error.captureStackTrace?.(this, this.constructor);
  }

  /** Plain-object representation used by the exception filter and logs. */
  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      code: this.code,
      message: this.message,
      name: this.name,
    };
    if (this.cause !== undefined) {
      json.cause =
        this.cause instanceof Error
          ? { name: this.cause.name, message: this.cause.message }
          : this.cause;
    }
    return json;
  }
}

/**
 * Thrown when a requested resource is not found.
 * Maps to HTTP 404 Not Found.
 */
export class EntityNotFoundException extends DomainException {
  readonly code: string = 'ENTITY_NOT_FOUND';
  readonly statusHint = 404;
  override readonly severity: ErrorSeverity = 'inline';

  constructor(
    public readonly entityType: string,
    public readonly identifier?: string,
  ) {
    super(
      identifier
        ? `${entityType} with identifier "${identifier}" not found`
        : `${entityType} not found`,
    );
  }
}

/**
 * Thrown when an operation conflicts with current state.
 * Maps to HTTP 409 Conflict.
 */
export class ConflictException extends DomainException {
  readonly code: string = 'CONFLICT';
  readonly statusHint = 409;
  override readonly severity: ErrorSeverity = 'toast';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when the user is not authorized for an operation.
 * Maps to HTTP 401 Unauthorized.
 */
export class UnauthorizedException extends DomainException {
  readonly code: string = 'UNAUTHORIZED';
  readonly statusHint = 401;
  override readonly severity: ErrorSeverity = 'modal';

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

/**
 * Thrown when the user is authenticated but lacks permission.
 * Maps to HTTP 403 Forbidden.
 */
export class ForbiddenException extends DomainException {
  readonly code: string = 'FORBIDDEN';
  readonly statusHint = 403;
  override readonly severity: ErrorSeverity = 'toast';

  constructor(message = 'Access denied') {
    super(message);
  }
}

/**
 * Thrown when input validation fails at the domain level.
 * Maps to HTTP 400 Bad Request.
 */
export class ValidationException extends DomainException {
  readonly code: string = 'VALIDATION_ERROR';
  readonly statusHint = 400;
  override readonly severity: ErrorSeverity = 'inline';

  constructor(
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/**
 * Thrown when a business rule is violated.
 * Maps to HTTP 422 Unprocessable Entity.
 */
export class BusinessRuleViolationException extends DomainException {
  readonly code: string = 'BUSINESS_RULE_VIOLATION';
  readonly statusHint = 422;
  override readonly severity: ErrorSeverity = 'banner';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when rate/usage limits are exceeded.
 * Maps to HTTP 429 Too Many Requests.
 */
export class LimitExceededException extends DomainException {
  readonly code: string = 'LIMIT_EXCEEDED';
  readonly statusHint = 429;
  override readonly severity: ErrorSeverity = 'modal';

  constructor(
    public readonly limitType: string,
    public readonly currentValue: number,
    public readonly maxValue: number,
  ) {
    super(`${limitType} limit exceeded: ${currentValue}/${maxValue}`);
  }
}
