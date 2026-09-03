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
}
