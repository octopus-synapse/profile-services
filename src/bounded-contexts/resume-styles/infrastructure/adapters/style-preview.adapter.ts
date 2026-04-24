import { Inject, Injectable } from '@nestjs/common';
import {
  EXPORT_USE_CASES,
  type ExportUseCases,
} from '@/bounded-contexts/export/application/ports/export.port';
import { type StylePreviewInput, StylePreviewPort } from '../../domain/ports/style-preview.port';

/**
 * Adapts the existing `EXPORT_USE_CASES.exportPdfUseCase` into the
 * thin `StylePreviewPort` the resume-styles preview use case
 * consumes. No data leaves the bounded context — only the rendered
 * PDF buffer.
 */
@Injectable()
export class StylePreviewAdapter extends StylePreviewPort {
  constructor(@Inject(EXPORT_USE_CASES) private readonly exports: ExportUseCases) {
    super();
  }

  async render(input: StylePreviewInput): Promise<Buffer> {
    return this.exports.exportPdfUseCase.execute({
      template: input.typstTemplate === 'ats' ? 'ats' : 'default',
      themeStyleConfig: input.styleConfig as Record<string, unknown>,
    });
  }
}
