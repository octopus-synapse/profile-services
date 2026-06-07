import { LoggerPort } from '@/shared-kernel';
import { StyleNotFoundError } from '../../domain/exceptions/resume-styles.exceptions';
import { ResumeStyleRepositoryPort } from '../../domain/ports/resume-style.repository.port';
import { StylePreviewPort } from '../../domain/ports/style-preview.port';

/**
 * Renders a preview PDF for a style by passing the style's
 * `typstTemplate` + `styleConfig` to the export pipeline through the
 * `StylePreviewPort`. The candidate style is applied as a draft theme
 * over the requesting user's primary resume, so the preview shows the
 * user's real content in the chosen style. (The Typst pipeline has no
 * blank-fixture mode — it renders an actual resume.)
 */
export class PreviewStyleUseCase {
  constructor(
    private readonly repo: ResumeStyleRepositoryPort,
    private readonly preview: StylePreviewPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(styleId: string, userId: string): Promise<Buffer> {
    const style = await this.repo.findById(styleId);
    if (!style) throw new StyleNotFoundError(styleId);
    return this.preview.render({
      userId,
      typstTemplate: style.typstTemplate,
      styleConfig: style.styleConfig,
    });
  }
}
