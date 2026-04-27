/**
 * Pure-TS wiring for the resume-quality BC. Zero `@nestjs/*` imports —
 * the Nest module is a thin shell that exposes the result of this
 * function as a single provider.
 */

import type { EventPublisher, LoggerPort } from '@/shared-kernel';
import type { ResumeQualityUseCases } from './application/ports/resume-quality.port';
import { ComputeQualityUseCase } from './application/use-cases/compute-quality.use-case';
import { GetLatestQualityUseCase } from './application/use-cases/get-latest-quality.use-case';
import type { ContentQualityPort } from './domain/ports/content-quality.port';
import type { QualityScoreRepositoryPort } from './domain/ports/quality-score.repository.port';
import type { ResumeLoaderPort } from './domain/ports/resume-loader.port';

export function buildResumeQualityUseCases(
  resumeLoader: ResumeLoaderPort,
  contentQuality: ContentQualityPort,
  repository: QualityScoreRepositoryPort,
  events: EventPublisher,
  logger: LoggerPort,
): ResumeQualityUseCases {
  return {
    computeQuality: new ComputeQualityUseCase(
      resumeLoader,
      contentQuality,
      repository,
      events,
      logger,
    ),
    getLatestQuality: new GetLatestQualityUseCase(repository),
  };
}
