/**
 * Import Domain Exceptions
 *
 * Framework-agnostic exceptions for the import bounded context.
 * Every subclass carries a stable code so the envelope is localizable.
 */
import {
  ConflictException,
  DomainException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class ImportNotFoundException extends DomainException {
  readonly code: string = 'IMPORT_NOT_FOUND';
  readonly statusHint = 404;
  constructor(importId: string) {
    super(`Import ${importId} not found`);
  }
}

export class ImportCannotBeCancelledException extends ConflictException {
  readonly code: string = 'IMPORT_CANNOT_BE_CANCELLED';
  constructor(importId: string) {
    super(`Cannot cancel completed import ${importId}`);
  }
}

export class ImportCannotBeRetriedException extends ConflictException {
  readonly code: string = 'IMPORT_CANNOT_BE_RETRIED';
  constructor(importId: string) {
    super(`Can only retry failed imports. Import ${importId} is not in FAILED state`);
  }
}

export class InvalidImportDataException extends ValidationException {
  readonly code: string = 'INVALID_IMPORT_DATA';
  constructor(message: string) {
    super(message);
  }
}
