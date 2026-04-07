/**
 * Export DOCX Use Case
 *
 * Generates a DOCX document for a user's resume.
 */

import type { DocxBuilderPort } from '../../../domain/ports/docx-builder.port';

export interface ExportDocxDto {
  userId: string;
}

export class ExportDocxUseCase {
  constructor(private readonly docxBuilder: DocxBuilderPort) {}

  async execute(dto: ExportDocxDto): Promise<Buffer> {
    return this.docxBuilder.generate(dto.userId);
  }
}
