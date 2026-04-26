import { StyleNotFoundError } from '../../domain/exceptions/resume-styles.exceptions';
import { ResumeStyleRepositoryPort } from '../../domain/ports/resume-style.repository.port';
import { StylePreviewPort } from '../../domain/ports/style-preview.port';

/**
 * Renders a generic preview PDF for a style by passing the style's
 * `typstTemplate` + `styleConfig` to the export pipeline through the
 * `StylePreviewPort`. No real resume data is involved — the PDF
 * backend falls back to its built-in fixture content.
 */
export class PreviewStyleUseCase {
  constructor(
    private readonly repo: ResumeStyleRepositoryPort,
    private readonly preview: StylePreviewPort,
  ) {}

  async execute(styleId: string): Promise<Buffer> {
    const style = await this.repo.findById(styleId);
    if (!style) throw new StyleNotFoundError(styleId);
    return this.preview.render({
      typstTemplate: style.typstTemplate,
      styleConfig: style.styleConfig,
    });
  }
}
