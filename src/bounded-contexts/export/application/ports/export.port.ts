/**
 * Export Port
 *
 * Defines the use cases interface and injection token for the Export BC.
 */

import type { PdfGeneratorOptions } from '../../domain/ports/pdf-generator.port';

// ============================================================================
// Use Cases Interface
// ============================================================================

export const EXPORT_USE_CASES = Symbol('EXPORT_USE_CASES');

export interface ExportUseCases {
  exportDocxUseCase: {
    execute: (dto: { userId: string }) => Promise<Buffer>;
  };
  exportPdfUseCase: {
    execute: (dto?: PdfGeneratorOptions) => Promise<Buffer>;
  };
  exportJsonUseCase: {
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
  exportLatexUseCase: {
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
}
