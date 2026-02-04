/**
 * Resume DOCX Service (Facade)
 * Delegates to specialized services for DOCX generation
 */

import { Injectable } from '@nestjs/common';
import { DocxBuilderService } from './docx-builder.service';

@Injectable()
export class ResumeDOCXService {
  constructor(private readonly builderService: DocxBuilderService) {}

  /**
   * Generate DOCX document for user resume
   */
  async generate(userId: string): Promise<Buffer> {
    return this.builderService.generate(userId);
  }
}
