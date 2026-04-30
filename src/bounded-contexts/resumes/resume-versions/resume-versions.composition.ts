/**
 * Pure-TS wiring for the resume-versions BC. Zero `@nestjs/*` imports.
 *
 * The two `ResumeTailorService` and `ResumeVersionService` facades stay
 * as Nest-decorated providers in the module shell so cross-BC
 * consumers (`automation/`, `resumes/core`) keep their stable surface;
 * the composition only exposes the use-case bundle they delegate to —
 * plus a `buildResumeVersionsComposition` returning the canonical
 * `{ useCases, routes }` shape for the Elysia bootstrap.
 */

import type { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { ResumeVersionsUseCases } from './application/ports/resume-versions.port';
import { ResumeTailorService } from './application/services/resume-tailor.service';
import { ResumeVersionService } from './application/services/resume-version.service';
import { CreateSnapshotUseCase } from './application/use-cases/create-snapshot/create-snapshot.use-case';
import { GetTailoredVersionDiffUseCase } from './application/use-cases/get-tailored-version-diff/get-tailored-version-diff.use-case';
import { GetTailoredVersionsUseCase } from './application/use-cases/get-tailored-versions/get-tailored-versions.use-case';
import { GetVersionsUseCase } from './application/use-cases/get-versions/get-versions.use-case';
import { RestoreVersionUseCase } from './application/use-cases/restore-version/restore-version.use-case';
import { TailorResumeForJobUseCase } from './application/use-cases/tailor-resume-for-job/tailor-resume-for-job.use-case';
import { LlmResumeTailorAdapter } from './infrastructure/adapters/external-services/llm-resume-tailor.adapter';
import { PrismaResumeVersionsRepository } from './infrastructure/adapters/persistence/prisma-resume-versions.repository';
import { resumeVersionsRoutes } from './resume-versions.routes';

export { ResumeTailorService, ResumeVersionService, ResumeVersionsUseCases };

export function buildResumeVersionsUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
  llm: LlmPort,
  events: ResumeEventPublisher,
): ResumeVersionsUseCases {
  // Repos
  const repo = new PrismaResumeVersionsRepository(prisma, logger);

  // External adapters
  const tailorLlm = new LlmResumeTailorAdapter(llm);

  // Use cases
  const createSnapshot = new CreateSnapshotUseCase(repo, events, logger);

  return {
    createSnapshot,
    getVersions: new GetVersionsUseCase(repo),
    restoreVersion: new RestoreVersionUseCase(repo, createSnapshot, events, logger),
    tailorResumeForJob: new TailorResumeForJobUseCase(repo, tailorLlm, logger),
    getTailoredVersions: new GetTailoredVersionsUseCase(repo),
    getTailoredVersionDiff: new GetTailoredVersionDiffUseCase(repo),
  };
}

export interface ResumeVersionsCompositionExtras {
  /** Tailor facade exposed for cross-BC consumers (`automation/`). */
  readonly tailor: ResumeTailorService;
  /** Version service facade exposed for `resumes/core` cross-BC consumer. */
  readonly versionService: ResumeVersionService;
}

export function buildResumeVersionsComposition(
  prisma: PrismaService,
  logger: LoggerPort,
  llm: LlmPort,
  events: ResumeEventPublisher,
): BoundedContextComposition<ResumeVersionsUseCases> & ResumeVersionsCompositionExtras {
  const useCases = buildResumeVersionsUseCases(prisma, logger, llm, events);
  const tailor = new ResumeTailorService(
    useCases.tailorResumeForJob,
    useCases.getTailoredVersions,
    useCases.getTailoredVersionDiff,
  );
  const versionService = new ResumeVersionService(
    useCases.createSnapshot,
    useCases.getVersions,
    useCases.restoreVersion,
  );

  return {
    useCases,
    routes: resumeVersionsRoutes,
    tailor,
    versionService,
  };
}
