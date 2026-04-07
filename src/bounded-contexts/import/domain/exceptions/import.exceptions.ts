/**
 * Import Domain Exceptions
 *
 * Framework-agnostic exceptions for the import bounded context.
 */

export class ImportNotFoundException extends Error {
  constructor(importId: string) {
    super(`Import ${importId} not found`);
    this.name = 'ImportNotFoundException';
  }
}

export class ImportCannotBeCancelledException extends Error {
  constructor(importId: string) {
    super(`Cannot cancel completed import ${importId}`);
    this.name = 'ImportCannotBeCancelledException';
  }
}

export class ImportCannotBeRetriedException extends Error {
  constructor(importId: string) {
    super(`Can only retry failed imports. Import ${importId} is not in FAILED state`);
    this.name = 'ImportCannotBeRetriedException';
  }
}

export class InvalidImportDataException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImportDataException';
  }
}
