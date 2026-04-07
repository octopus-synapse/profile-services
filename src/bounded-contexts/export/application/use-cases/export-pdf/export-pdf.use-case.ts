/**
 * Export PDF Use Case
 *
 * Generates a PDF document for a user's resume.
 */

import type { PdfGeneratorOptions, PdfGeneratorPort } from '../../../domain/ports/pdf-generator.port';

export interface ExportPdfDto {
  palette?: string;
  lang?: string;
  bannerColor?: string;
  userId?: string;
}

export class ExportPdfUseCase {
  constructor(private readonly pdfGenerator: PdfGeneratorPort) {}

  async execute(dto: ExportPdfDto = {}): Promise<Buffer> {
    const options: PdfGeneratorOptions = {
      palette: dto.palette,
      lang: dto.lang,
      bannerColor: dto.bannerColor,
      userId: dto.userId,
    };

    return this.pdfGenerator.generate(options);
  }
}
