/**
 * PDF Generator Port
 *
 * Abstraction for PDF document generation.
 */

export type PdfTemplate = 'default' | 'ats';

export interface PdfGeneratorOptions {
  palette?: string;
  lang?: string;
  bannerColor?: string;
  userId?: string;
  timeout?: number;
  template?: PdfTemplate;
}

export abstract class PdfGeneratorPort {
  abstract generate(options?: PdfGeneratorOptions): Promise<Buffer>;
}
