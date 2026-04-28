/**
 * Pure-TS wiring for the resume-styles BC. Zero `@nestjs/*` imports.
 *
 * Phase-1 canonical shape: `buildResumeStylesComposition(...)` returns
 * `{ useCases, routes }` as a `BoundedContextComposition`. The Nest
 * shell (`*.module.ts`) adapts the same composition to Nest's DI graph.
 */

import type { ExportUseCases } from '@/bounded-contexts/export/application/ports/export.port';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventPublisher, LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { ResumeStylesUseCases } from './application/ports/resume-styles.port';
import { CreateStyleUseCase } from './application/use-cases/admin/create-style.use-case';
import { DeleteStyleUseCase } from './application/use-cases/admin/delete-style.use-case';
import { UpdateStyleUseCase } from './application/use-cases/admin/update-style.use-case';
import { ApplyStyleToResumeUseCase } from './application/use-cases/apply-style-to-resume.use-case';
import { GetStyleUseCase } from './application/use-cases/get-style.use-case';
import { ListStylesUseCase } from './application/use-cases/list-styles.use-case';
import { PreviewStyleUseCase } from './application/use-cases/preview-style.use-case';
import type { ResumeStyleRepositoryPort } from './domain/ports/resume-style.repository.port';
import type { StylePreviewPort } from './domain/ports/style-preview.port';
import type { StyleScorerPort } from './domain/ports/style-scorer.port';
import { PrismaResumeStyleRepository } from './infrastructure/adapters/persistence/prisma-resume-style.repository';
import { StylePreviewAdapter } from './infrastructure/adapters/style-preview.adapter';
import { StyleScorerAdapter } from './infrastructure/adapters/style-scorer.adapter';
import { resumeStylesRoutes } from './resume-styles.routes';

export { ResumeStylesUseCases };

export function buildResumeStylesUseCases(
  repo: ResumeStyleRepositoryPort,
  scorer: StyleScorerPort,
  preview: StylePreviewPort,
  events: EventPublisher,
  logger: LoggerPort,
): ResumeStylesUseCases {
  return {
    listStyles: new ListStylesUseCase(repo),
    getStyle: new GetStyleUseCase(repo),
    previewStyle: new PreviewStyleUseCase(repo, preview, logger),
    applyStyleToResume: new ApplyStyleToResumeUseCase(repo, events, logger),
    createStyle: new CreateStyleUseCase(repo, scorer, logger),
    updateStyle: new UpdateStyleUseCase(repo, scorer, logger),
    deleteStyle: new DeleteStyleUseCase(repo),
  };
}

/**
 * Build the framework-free composition for the resume-styles BC.
 * Constructs every adapter (style scorer, preview renderer, repository)
 * internally so callers only pass infra-level deps (Prisma, ExportUseCases,
 * EventPublisher, Logger).
 */
export function buildResumeStylesComposition(
  prisma: PrismaService,
  exports: ExportUseCases,
  events: EventPublisher,
  logger: LoggerPort,
): BoundedContextComposition<ResumeStylesUseCases> {
  const repo = new PrismaResumeStyleRepository(prisma, logger);
  const scorer = new StyleScorerAdapter();
  const preview = new StylePreviewAdapter(exports);

  const useCases = buildResumeStylesUseCases(repo, scorer, preview, events, logger);

  return {
    useCases,
    routes: resumeStylesRoutes,
  };
}
