import { ExportUseCases } from '@/bounded-contexts/export/application/ports/export.port';
import { type StylePreviewInput, StylePreviewPort } from '../../domain/ports/style-preview.port';

/**
 * Adapts the existing `ExportUseCases.exportPdfUseCase` into the
 * thin `StylePreviewPort` the resume-styles preview use case
 * consumes. No data leaves the bounded context — only the rendered
 * PDF buffer.
 *
 * Framework-free POJO. Wired by `resume-styles.composition.ts`.
 */
export class StylePreviewAdapter extends StylePreviewPort {
  constructor(private readonly exports: ExportUseCases) {
    super();
  }

  async render(input: StylePreviewInput): Promise<Buffer> {
    return this.exports.exportPdfUseCase.execute({
      userId: input.userId,
      template: input.typstTemplate === 'ats' ? 'ats' : 'default',
      // Rendered as a draft theme over the user's primary resume — the DSL
      // renderer merges this `themeStyleConfig` and so doesn't require the
      // resume to already have an active style.
      themeStyleConfig: input.styleConfig as Record<string, unknown>,
    });
  }
}
