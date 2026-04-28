/**
 * Onboarding Preview Adapter
 *
 * Renders a low-res PNG preview of the resume being built during onboarding.
 * Uses the existing Typst pipeline but with optimizations:
 * - Persistent temp dir (templates copied once)
 * - Low PPI (72) for speed
 * - First page only
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { DslUseCases } from '@/bounded-contexts/dsl';
import { TypstCompilerService } from '@/bounded-contexts/export/infrastructure/adapters/external-services/typst-compiler.service';
import { TypstDataSerializerService } from '@/bounded-contexts/export/infrastructure/adapters/external-services/typst-data-serializer.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import { PreviewRendererPort } from '../../domain/ports/preview-renderer.port';

export class OnboardingPreviewAdapter extends PreviewRendererPort implements Lifecycle {
  private readonly logger = new Logger(OnboardingPreviewAdapter.name);
  private workDir: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dsl: Pick<DslUseCases, 'renderResumeDsl'>,
    private readonly serializer: TypstDataSerializerService,
    private readonly compiler: TypstCompilerService,
  ) {
    super();
  }

  async init(): Promise<void> {
    try {
      this.workDir = join('/tmp', 'typst-onboarding-preview');
      await mkdir(this.workDir, { recursive: true });

      const templatesPath = await this.compiler.getAtsTemplatesPath();
      const { readdir, copyFile, cp } = await import('node:fs/promises');
      const entries = await readdir(templatesPath, { withFileTypes: true });

      await Promise.all(
        entries.map((entry) => {
          const src = join(templatesPath, entry.name);
          const dest = join(this.workDir ?? '', entry.name);
          return entry.isDirectory() ? cp(src, dest, { recursive: true }) : copyFile(src, dest);
        }),
      );

      this.logger.log('Preview worker initialized — templates cached');
    } catch (err) {
      this.logger.warn(`Preview worker init failed: ${(err as Error).message}`);
      this.workDir = null;
    }
  }

  async renderPreview(userId: string): Promise<Buffer | null> {
    if (!this.workDir) return null;

    const resume = await this.prisma.resume.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, userId: true },
    });

    if (!resume) return null;

    try {
      const { ast } = await this.dsl.renderResumeDsl.execute({
        resumeId: resume.id,
        userId: resume.userId,
        target: 'pdf',
        locale: 'pt-BR',
      });

      const jsonData = this.serializer.serialize(ast);

      await writeFile(join(this.workDir, 'data.json'), jsonData, 'utf-8');

      return await this.compiler.compileToImage(jsonData, this.workDir, {
        ppi: 72,
        timeout: 10_000,
      });
    } catch (err) {
      this.logger.debug(`Preview render failed for user ${userId}: ${(err as Error).message}`);
      return null;
    }
  }
}
