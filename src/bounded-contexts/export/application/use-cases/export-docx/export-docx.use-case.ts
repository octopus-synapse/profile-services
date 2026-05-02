/**
 * Export DOCX Use Case
 *
 * Generates a DOCX document for a user's resume.
 */

import { ExportDocxGenerationFailedException } from '../../../domain/exceptions/export.exceptions';
import { DocxBuilderPort } from '../../../domain/ports/docx-builder.port';

export interface ExportDocxDto {
  userId: string;
}

export class ExportDocxUseCase {
  constructor(private readonly docxBuilder: DocxBuilderPort) {}

  async execute(dto: ExportDocxDto): Promise<Buffer> {
    try {
      return await this.docxBuilder.generate(dto.userId);
    } catch (err) {
      // Let known domain exceptions (EntityNotFoundException, etc) flow
      // through unchanged so the global filter keeps their status hint;
      // wrap raw / framework errors into a translated 502.
      if (err instanceof Error && err.constructor.name.endsWith('Exception')) {
        throw err;
      }
      throw new ExportDocxGenerationFailedException(
        err instanceof Error ? err.message : 'unknown',
      );
    }
  }
}
