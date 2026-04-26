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

/**
 * GitHub Not Connected Exception
 *
 * Raised by the GitHub import flow when the user hasn't linked a GitHub
 * OAuth account yet — we can't fetch any viewer data without a token.
 */
export class GithubNotConnectedException extends ConflictException {
  readonly code: string = 'GITHUB_NOT_CONNECTED';
  constructor() {
    super('GitHub account is not connected');
  }
}

/**
 * PDF Buffer Required Exception
 *
 * Raised by the PDF import flow when the multipart payload arrived without
 * a usable buffer (field missing / empty upload).
 */
export class PdfBufferRequiredException extends ValidationException {
  readonly code: string = 'PDF_BUFFER_REQUIRED';
  constructor() {
    super('PDF file buffer is required');
  }
}

/**
 * PDF Too Large Exception
 *
 * Raised when the uploaded PDF exceeds the hard size cap. Hard cap exists
 * so a malicious upload can't blow up memory during parsing.
 */
export class PdfTooLargeException extends ValidationException {
  readonly code: string = 'PDF_TOO_LARGE';
  constructor() {
    super('PDF file exceeds the maximum allowed size');
  }
}

/**
 * PDF No Text Exception
 *
 * Raised when the PDF parsed successfully but yielded almost no text —
 * usually an image-only PDF that `pdf-parse` couldn't OCR. The UI should
 * prompt the user to upload a text-based PDF instead.
 */
export class PdfNoTextException extends ValidationException {
  readonly code: string = 'PDF_NO_TEXT';
  constructor() {
    super('PDF does not contain extractable text');
  }
}

/** Multipart upload arrived without a `file` field. */
export class MissingPdfUploadException extends ValidationException {
  readonly code: string = 'IMPORT_FILE_MISSING';
  constructor() {
    super('Missing file (multipart field "file")');
  }
}

/** JSON Resume payload is missing the required `basics` section. */
export class JsonResumeBasicsMissingException extends ValidationException {
  readonly code: string = 'IMPORT_MISSING_BASICS';
  constructor() {
    super('Missing basics section');
  }
}

/** JSON Resume payload is missing `basics.name`. */
export class JsonResumeNameMissingException extends ValidationException {
  readonly code: string = 'IMPORT_MISSING_BASICS_NAME';
  constructor() {
    super('Name is required in basics section');
  }
}

/**
 * The LinkedIn import endpoint is a deliberate scaffold — the route exists
 * so the UI can call it and get a clean 503 instead of a 404, but the
 * actual LinkedIn v2 API client hasn't landed yet.
 */
export class LinkedinImportNotImplementedException extends DomainException {
  readonly code: string = 'LINKEDIN_IMPORT_NOT_IMPLEMENTED';
  readonly statusHint = 503;
  constructor() {
    super('LinkedIn import not implemented yet');
  }
}
