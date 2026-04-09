/**
 * Resume PDF Service (Facade)
 * Delegates to TypstPdfGeneratorService for server-side PDF generation.
 * No frontend dependency — generates PDFs directly from resume data via Typst.
 */

import { Injectable } from '@nestjs/common';
import type { PdfGeneratorOptions } from '../../domain/ports/pdf-generator.port';
import { TypstPdfGeneratorService } from '../../infrastructure/adapters/external-services/typst-pdf-generator.service';

@Injectable()
export class ResumePDFService {
  constructor(private readonly generatorService: TypstPdfGeneratorService) {}

  /**
   * Generate PDF from resume
   */
  async generate(options: PdfGeneratorOptions = {}): Promise<Buffer> {
    return this.generatorService.generate(options);
  }
}
