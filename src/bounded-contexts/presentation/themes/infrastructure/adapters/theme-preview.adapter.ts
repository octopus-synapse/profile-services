/**
 * Theme Preview Service
 *
 * Generates a PNG preview (first page) of a theme applied to a
 * designated preview resume, uploads to MinIO, and persists the
 * URL in ResumeTheme.thumbnailUrl.
 */

import { Injectable, Logger } from '@nestjs/common';
import { DslRepository } from '@/bounded-contexts/dsl/dsl.repository';
import { TypstCompilerService } from '@/bounded-contexts/export/infrastructure/adapters/external-services/typst-compiler.service';
import { TypstDataSerializerService } from '@/bounded-contexts/export/infrastructure/adapters/external-services/typst-data-serializer.service';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ThemePreviewPort } from '../../domain/ports/theme-preview.port';

@Injectable()
export class ThemePreviewService extends ThemePreviewPort {
  private readonly logger = new Logger(ThemePreviewService.name);
  private readonly previewResumeId = process.env.THEME_PREVIEW_RESUME_ID;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dslRepository: DslRepository,
    private readonly serializer: TypstDataSerializerService,
    private readonly compiler: TypstCompilerService,
    private readonly s3: S3UploadService,
  ) {
    super();
  }

  async generateAndUploadPreview(themeId: string): Promise<string | null> {
    if (!this.previewResumeId) {
      this.logger.warn('THEME_PREVIEW_RESUME_ID not configured — skipping');
      return null;
    }

    const [theme, resume] = await Promise.all([
      this.prisma.resumeTheme.findUnique({
        where: { id: themeId },
        select: { id: true, styleConfig: true },
      }),
      this.prisma.resume.findUnique({
        where: { id: this.previewResumeId },
        select: { userId: true },
      }),
    ]);

    if (!theme || !resume) {
      this.logger.warn(`Theme or preview resume not found — skipping`);
      return null;
    }

    try {
      // 1. Render AST with theme override
      const { ast } = await this.dslRepository.render(
        this.previewResumeId,
        resume.userId,
        'pdf',
        'pt-BR',
        theme.styleConfig as Record<string, unknown>,
      );

      // 2. Serialize to JSON
      const jsonData = this.serializer.serialize(ast);

      // 3. Compile to PNG (first page, 150 PPI)
      const templatesPath = await this.compiler.getAtsTemplatesPath();
      const pngBuffer = await this.compiler.compileToImage(jsonData, templatesPath, { ppi: 150 });

      // 4. Upload to MinIO
      const key = `themes/${themeId}/preview.png`;
      const result = await this.s3.uploadFile(pngBuffer, key, 'image/png');

      if (!result) {
        this.logger.warn('MinIO upload returned null — service may be disabled');
        return null;
      }

      // 5. Persist URL
      await this.prisma.resumeTheme.update({
        where: { id: themeId },
        data: { thumbnailUrl: result.url },
      });

      this.logger.log(
        `Preview PNG generated for theme ${themeId}: ${result.url} (${pngBuffer.length} bytes)`,
      );
      return result.url;
    } catch (error) {
      this.logger.error(`Failed to generate preview for theme ${themeId}`, (error as Error).stack);
      return null;
    }
  }
}
