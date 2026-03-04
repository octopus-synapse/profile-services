/**
 * Domain Exceptions
 *
 * Framework-independent exception classes for use in use-cases.
 * These exceptions represent domain-level errors that can be caught
 * and converted to HTTP responses by the application layer.
 */

/**
 * Base class for all domain exceptions.
 * Provides a code property for programmatic error handling.
 */
export abstract class DomainException extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace in V8 environments
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Thrown when a requested resource is not found.
 * Maps to HTTP 404 Not Found.
 */
export class EntityNotFoundException extends DomainException {
  readonly code = 'ENTITY_NOT_FOUND';

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
  readonly code = 'CONFLICT';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when the user is not authorized for an operation.
 * Maps to HTTP 401 Unauthorized.
 */
export class UnauthorizedException extends DomainException {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

/**
 * Thrown when the user is authenticated but lacks permission.
 * Maps to HTTP 403 Forbidden.
 */
export class ForbiddenException extends DomainException {
  readonly code = 'FORBIDDEN';

  constructor(message = 'Access denied') {
    super(message);
  }
}

/**
 * Thrown when input validation fails at the domain level.
 * Maps to HTTP 400 Bad Request.
 */
export class ValidationException extends DomainException {
  readonly code = 'VALIDATION_ERROR';

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
  readonly code = 'BUSINESS_RULE_VIOLATION';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when rate/usage limits are exceeded.
 * Maps to HTTP 429 Too Many Requests.
 */
export class LimitExceededException extends DomainException {
  readonly code = 'LIMIT_EXCEEDED';

  constructor(
    public readonly limitType: string,
    public readonly currentValue: number,
    public readonly maxValue: number,
  ) {
    super(`${limitType} limit exceeded: ${currentValue}/${maxValue}`);
  }
}
