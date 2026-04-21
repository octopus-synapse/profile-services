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
