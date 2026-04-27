/**
 * Pure-TS wiring for the resume-styles BC. Zero `@nestjs/*` imports —
 * the Nest module is a thin shell that exposes the result of this
 * function as a single provider.
 */

import type { EventPublisher, LoggerPort } from '@/shared-kernel';
import type { ResumeStylesUseCases } from './application/ports/resume-styles.port';
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
