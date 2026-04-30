/**
 * Export Port
 *
 * Defines the use cases interface and injection token for the Export BC.
 */

import type { PdfGeneratorOptions } from '../../domain/ports/pdf-generator.port';

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class ExportUseCases {
  abstract readonly exportDocxUseCase: {
    execute: (dto: { userId: string }) => Promise<Buffer>;
  };
  abstract readonly exportPdfUseCase: { execute: (dto?: PdfGeneratorOptions) => Promise<Buffer> };
  abstract readonly exportJsonUseCase: {
    execute: (dto: {
      resumeId: string;
      format?: 'jsonresume' | 'profile';
      language?: 'en' | 'pt';
    }) => Promise<object>;
    executeAsBuffer: (dto: {
      resumeId: string;
      format?: 'jsonresume' | 'profile';
      language?: 'en' | 'pt';
    }) => Promise<Buffer>;
  };
  abstract readonly exportLatexUseCase: {
    execute: (dto: {
      resumeId: string;
      template?: 'simple' | 'moderncv';
      language?: 'en' | 'pt';
    }) => Promise<string>;
    executeAsBuffer: (dto: {
      resumeId: string;
      template?: 'simple' | 'moderncv';
      language?: 'en' | 'pt';
    }) => Promise<Buffer>;
  };
  abstract readonly exportBundleUseCase: {
    execute: (dto: {
      userId: string;
      resumeId: string;
      formats?: Array<'pdf' | 'docx' | 'json'>;
      language?: 'en' | 'pt';
    }) => Promise<Buffer>;
  };
}
