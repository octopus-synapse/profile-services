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

/**
 * Generic envelope for the controller-side `try { useCase.execute() } catch`
 * path: an unexpected failure surfaced from within the export pipeline. The
 * controller still publishes the matching `ExportFailedEvent` so the audit /
 * notifications / retry workers see the failure; this exception then carries
 * a domain `code` so the global filter emits a translated 500 instead of a
 * raw Nest `InternalServerErrorException`.
 */
export class ExportPipelineFailedException extends DomainException {
  readonly code: string = 'EXPORT_PIPELINE_FAILED';
  readonly statusHint = 500;
  constructor(public readonly format: string) {
    super(`Failed to generate ${format}. Please try again later.`);
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

export class TypstCompilationFailedException extends DomainException {
  readonly code: string = 'TYPST_COMPILATION_FAILED';
  readonly statusHint = 502;
  constructor(format: 'pdf' | 'png', detail: string) {
    super(`Typst ${format.toUpperCase()} compilation failed: ${detail}`);
  }
}

export class TypstTemplatesNotFoundException extends DomainException {
  readonly code: string = 'TYPST_TEMPLATES_NOT_FOUND';
  readonly statusHint = 503;
  constructor(searched: string[]) {
    super(
      `Typst templates not found. Tried: ${searched.join(', ')}. Set TYPST_TEMPLATES_PATH env var.`,
    );
  }
}

export class TypstAtsTemplatesNotFoundException extends DomainException {
  readonly code: string = 'TYPST_ATS_TEMPLATES_NOT_FOUND';
  readonly statusHint = 503;
  constructor(path: string) {
    super(`ATS Typst templates not found at ${path}. Ensure templates-ats/ directory exists.`);
  }
}

export class BannerElementNotFoundException extends DomainException {
  readonly code: string = 'BANNER_ELEMENT_NOT_FOUND';
  readonly statusHint = 502;
  constructor() {
    super('Banner element not found');
  }
}

export class TypstUserIdRequiredException extends ValidationException {
  readonly code: string = 'TYPST_USER_ID_REQUIRED';
  constructor() {
    super('userId is required for Typst PDF generation');
  }
}

export class TypstWasmRendererNotImplementedException extends DomainException {
  readonly code: string = 'TYPST_WASM_RENDERER_NOT_IMPLEMENTED';
  readonly statusHint = 501;
  constructor() {
    super(
      'TypstWasmPdfRenderer is not yet implemented. Awaiting Typst WASM binding integration. Use the existing TypstCompilerService as fallback.',
    );
  }
}

/**
 * Format-specific generation failures. These wrap the underlying engine
 * error (Typst, Puppeteer, docx) with a stable `code` so the i18n
 * filter translates the response without leaking implementation detail.
 */
export class ExportPdfGenerationFailedException extends DomainException {
  readonly code: string = 'EXPORT_PDF_GENERATION_FAILED';
  readonly statusHint = 502;
  constructor(detail?: string) {
    super(detail ? `PDF generation failed: ${detail}` : 'PDF generation failed');
  }
}

export class ExportDocxGenerationFailedException extends DomainException {
  readonly code: string = 'EXPORT_DOCX_GENERATION_FAILED';
  readonly statusHint = 502;
  constructor(detail?: string) {
    super(detail ? `DOCX generation failed: ${detail}` : 'DOCX generation failed');
  }
}

export class ExportBannerGenerationFailedException extends DomainException {
  readonly code: string = 'EXPORT_BANNER_GENERATION_FAILED';
  readonly statusHint = 502;
  constructor(detail?: string) {
    super(detail ? `Banner generation failed: ${detail}` : 'Banner generation failed');
  }
}
