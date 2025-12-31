/**
 * Resume PDF Service (Facade)
 * Delegates to specialized services for PDF generation
 */

import { Injectable } from '@nestjs/common';
import { PdfGeneratorService } from './pdf-generator.service';
import { ResumePDFOptions } from '../helpers';

@Injectable()
export class ResumePDFService {
  constructor(private readonly generatorService: PdfGeneratorService) {}

  /**
   * Generate PDF from resume
   */
  async generate(options: ResumePDFOptions = {}): Promise<Buffer> {
    return this.generatorService.generate(options);
  }
}
