/**
 * Export Bounded Context Exceptions
 *
 * Covers PDF / DOCX / JSON export pipelines.
 */
import { DomainException, ValidationException } from '@/shared-kernel/exceptions';

export class ExportEngineFailedException extends DomainException {
  readonly code: string = 'EXPORT_ENGINE_FAILED';
  readonly statusHint = 502;
  constructor(format: string, reason?: string) {
    super(`Export to ${format} failed${reason ? `: ${reason}` : ''}`);
  }
}

export class UnsupportedExportFormatException extends ValidationException {
  readonly code: string = 'UNSUPPORTED_EXPORT_FORMAT';
  constructor(format: string) {
    super(`Export format "${format}" is not supported`);
  }
}

export class ExportPayloadTooLargeException extends ValidationException {
  readonly code: string = 'EXPORT_PAYLOAD_TOO_LARGE';
  constructor(maxBytes: number) {
    super(`Export payload exceeds limit of ${maxBytes} bytes`);
  }
}

export class ExportThemeInvalidException extends ValidationException {
  readonly code: string = 'EXPORT_THEME_INVALID';
  constructor(theme: string) {
    super(`Theme "${theme}" is not valid for export`);
  }
}

export class BundleAssemblyPartialException extends DomainException {
  readonly code: string = 'BUNDLE_ASSEMBLY_PARTIAL';
  readonly statusHint = 207;
  constructor(public readonly missing: string[]) {
    super(`Bundle missing formats: ${missing.join(', ')}`);
  }
}
