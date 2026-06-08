/**
 * Export PDF Use Case
 *
 * Generates a PDF document for a user's resume.
 */

import {
  ExportPdfGenerationFailedException,
  ExportThemeInvalidException,
} from '../../../domain/exceptions/export.exceptions';
import type { PdfGeneratorOptions } from '../../../domain/ports/pdf-generator.port';
import { PdfGeneratorPort } from '../../../domain/ports/pdf-generator.port';

export interface ExportPdfDto {
  palette?: string;
  lang?: string;
  bannerColor?: string;
  userId?: string;
  template?: 'default' | 'ats';
  themeStyleConfig?: Record<string, unknown>;
  /** Render a built-in sample résumé when the user has no primary
   *  résumé (generic style preview). */
  sampleFallback?: boolean;
}

/** Themes/palettes are alphanumeric + dashes; reject obvious shell / path
 * injection at the use-case boundary so we don't ship a malformed value
 * down to the renderer. */
const VALID_THEME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export class ExportPdfUseCase {
  constructor(private readonly pdfGenerator: PdfGeneratorPort) {}

  async execute(dto: ExportPdfDto = {}): Promise<Buffer> {
    if (dto.palette !== undefined && !VALID_THEME_PATTERN.test(dto.palette)) {
      throw new ExportThemeInvalidException(dto.palette);
    }

    const options: PdfGeneratorOptions = {
      palette: dto.palette,
      lang: dto.lang,
      bannerColor: dto.bannerColor,
      userId: dto.userId,
      template: dto.template,
      themeStyleConfig: dto.themeStyleConfig,
      sampleFallback: dto.sampleFallback,
    };

    try {
      return await this.pdfGenerator.generate(options);
    } catch (err) {
      // Preserve known domain exceptions (e.g. EntityNotFoundException) and
      // wrap the rest so the global filter emits a translated 502.
      if (err instanceof ExportThemeInvalidException) throw err;
      if (err instanceof Error && err.constructor.name.endsWith('Exception')) {
        throw err;
      }
      throw new ExportPdfGenerationFailedException(err instanceof Error ? err.message : 'unknown');
    }
  }
}
