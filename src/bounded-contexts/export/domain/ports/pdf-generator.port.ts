/**
 * PDF Generator Port
 *
 * Abstraction for PDF document generation.
 */

export interface PdfGeneratorOptions {
  palette?: string;
  lang?: string;
  bannerColor?: string;
  userId?: string;
  timeout?: number;
}

export abstract class PdfGeneratorPort {
  abstract generate(options?: PdfGeneratorOptions): Promise<Buffer>;
}
