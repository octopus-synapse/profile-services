/**
 * DSL Bounded Context Exceptions
 *
 * Covers the resume DSL parser and evaluator.
 */
import { DomainException, ValidationException } from '@/shared-kernel/exceptions';

export class DslParseErrorException extends ValidationException {
  readonly code: string = 'DSL_PARSE_ERROR';
  constructor(reason: string) {
    super(`DSL parse error: ${reason}`);
  }
}

export class DslUnknownFunctionException extends ValidationException {
  readonly code: string = 'DSL_UNKNOWN_FUNCTION';
  constructor(name: string) {
    super(`DSL function "${name}" is not registered`);
  }
}

export class DslTypeMismatchException extends ValidationException {
  readonly code: string = 'DSL_TYPE_MISMATCH';
  constructor(expected: string, got: string) {
    super(`DSL type mismatch: expected ${expected}, got ${got}`);
  }
}

export class DslCyclicReferenceException extends ValidationException {
  readonly code: string = 'DSL_CYCLIC_REFERENCE';
  constructor(path: string[]) {
    super(`DSL cyclic reference detected: ${path.join(' → ')}`);
  }
}

export class DslEvaluationLimitExceededException extends DomainException {
  readonly code: string = 'DSL_EVALUATION_LIMIT_EXCEEDED';
  readonly statusHint = 422;
  constructor() {
    super('DSL evaluation exceeded the instruction limit');
  }
}

export class DslValidationFailedException extends ValidationException {
  readonly code: string = 'DSL_VALIDATION_FAILED';
  constructor(details?: Record<string, string[]>) {
    super('Invalid DSL', details);
  }
}

export class DslNormalizedMissingException extends ValidationException {
  readonly code: string = 'DSL_NORMALIZED_MISSING';
  constructor() {
    super('Validation succeeded but normalized DSL is missing');
  }
}

export class DslUnsupportedVersionException extends ValidationException {
  readonly code: string = 'DSL_UNSUPPORTED_VERSION';
  constructor(version: string | number) {
    super(`Target DSL version ${version} is not supported`);
  }
}

export class DslMigrationLoopException extends ValidationException {
  readonly code: string = 'DSL_MIGRATION_LOOP';
  constructor(version?: string | number) {
    super(
      version !== undefined
        ? `Circular migration detected at version ${version}`
        : 'Migration loop detected',
    );
  }
}

export class DslMigrationPathNotFoundException extends ValidationException {
  readonly code: string = 'DSL_MIGRATION_PATH_NOT_FOUND';
  constructor(from: string | number, to: string | number) {
    super(`No migration path from ${from} to ${to}`);
  }
}

export class DslUnexpectedTokenException extends ValidationException {
  readonly code: string = 'DSL_UNEXPECTED_TOKEN';
  constructor(token: string) {
    super(`Unexpected token: ${token}`);
  }
}

export class DslExpectedTokenException extends ValidationException {
  readonly code: string = 'DSL_EXPECTED_TOKEN';
  constructor(expected: string) {
    super(`Expected ${expected}`);
  }
}

export class DslUnknownOperatorException extends ValidationException {
  readonly code: string = 'DSL_UNKNOWN_OPERATOR';
  constructor(operator: string) {
    super(`Unknown operator: ${operator}`);
  }
}

export class DslErrorExpressionException extends ValidationException {
  readonly code: string = 'DSL_ERROR_EXPRESSION';
  constructor(message: string) {
    super(message);
  }
}

export class DslMigrationResultVersionMismatchException extends ValidationException {
  readonly code: string = 'DSL_MIGRATION_RESULT_VERSION_MISMATCH';
  constructor(expected: string, got: string) {
    super(`Migration failed: expected version ${expected}, got ${got}`);
  }
}

export class ResumeNoActiveStyleException extends ValidationException {
  readonly code: string = 'DSL_RESUME_NO_ACTIVE_STYLE';
  constructor() {
    super('Resume has no active style. Please apply a style before rendering.');
  }
}
