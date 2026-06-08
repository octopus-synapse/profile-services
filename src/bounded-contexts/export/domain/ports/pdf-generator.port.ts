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
  resumeId?: string;
  themeStyleConfig?: Record<string, unknown>;
  /** When set and the user has no primary résumé, render a built-in
   *  sample résumé styled with `themeStyleConfig` instead of throwing
   *  `EntityNotFoundException('Resume')`. Used by the generic style
   *  preview so onboarding (no résumé yet) still gets a real PDF. */
  sampleFallback?: boolean;
}

export abstract class PdfGeneratorPort {
  abstract generate(options?: PdfGeneratorOptions): Promise<Buffer>;
}
