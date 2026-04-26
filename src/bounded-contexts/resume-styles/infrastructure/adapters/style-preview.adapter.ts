import { Injectable } from '@nestjs/common';
import { ExportUseCases } from '@/bounded-contexts/export/application/ports/export.port';
import { type StylePreviewInput, StylePreviewPort } from '../../domain/ports/style-preview.port';

/**
 * Adapts the existing `ExportUseCases.exportPdfUseCase` into the
 * thin `StylePreviewPort` the resume-styles preview use case
 * consumes. No data leaves the bounded context — only the rendered
 * PDF buffer.
 */
@Injectable()
export class StylePreviewAdapter extends StylePreviewPort {
  constructor(private readonly exports: ExportUseCases) {
    super();
  }

  async render(input: StylePreviewInput): Promise<Buffer> {
    return this.exports.exportPdfUseCase.execute({
      template: input.typstTemplate === 'ats' ? 'ats' : 'default',
      themeStyleConfig: input.styleConfig as Record<string, unknown>,
    });
  }
}
