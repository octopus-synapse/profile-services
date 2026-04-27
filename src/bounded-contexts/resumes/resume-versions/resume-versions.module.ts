/**
 * Resume Versions Module
 *
 * Thin Nest shell over `buildResumeVersionsUseCases`. All wiring lives
 * in `resume-versions.composition.ts`. All version + tailor endpoints
 * are described in `resume-versions.routes.ts` and synthesized at
 * module load. The custom guards `RequireFitProfileGuard` +
 * `RequireMinQualityGuard` are wired through the synthesizer guard
 * registry under ids `fit-profile` and `min-quality`. The
 * min-quality guard reads two metadata keys (threshold + resume
 * param), so its registry entry uses `applyMetadata` to set both.
 */

import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { FitProfileModule } from '@/bounded-contexts/fit-profile/fit-profile.module';
import { RequireFitProfileGuard } from '@/bounded-contexts/fit-profile/infrastructure/guards/require-fit-profile.guard';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { RequireMinQualityGuard } from '@/bounded-contexts/resume-quality/infrastructure/guards/require-min-quality.guard';
import { ResumeQualityModule } from '@/bounded-contexts/resume-quality/resume-quality.module';
import { ResumeVersionServicePort } from '@/bounded-contexts/resumes/core/ports/resume-version-service.port';
import { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import { ResumeEventPublisherAdapter } from '@/bounded-contexts/resumes/infrastructure/adapters';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventPublisher, LoggerPort } from '@/shared-kernel';
import { ResumeVersionsUseCases } from './application/ports/resume-versions.port';
import { ResumeTailorService } from './application/services/resume-tailor.service';
import { ResumeVersionService } from './application/services/resume-version.service';
import { buildResumeVersionsUseCases } from './resume-versions.composition';
import { resumeVersionsRoutes } from './resume-versions.routes';

@Module({
  imports: [PrismaModule, AiModule, FitProfileModule, ResumeQualityModule],
  controllers: [
    ...synthesizeRouteControllers(ResumeVersionsUseCases, resumeVersionsRoutes, {
      guards: {
        'fit-profile': { guard: RequireFitProfileGuard },
        'min-quality': {
          guard: RequireMinQualityGuard,
          // The guard reads two reflector keys: the numeric threshold
          // (`requireMinQuality`) and the optional route-param name
          // (`requireMinQualityResumeParam`). When `metadata` is
          // omitted the guard's own defaults (min=50, no resume
          // param) take over.
          applyMetadata: (metadata, target) => {
            const min =
              typeof metadata?.min === 'number' ? metadata.min : 50;
            const resumeParam =
              typeof metadata?.resumeParam === 'string' ? metadata.resumeParam : null;
            Reflect.defineMetadata('requireMinQuality', min, target);
            Reflect.defineMetadata('requireMinQualityResumeParam', resumeParam, target);
          },
        },
      },
    }),
  ],
  providers: [
    {
      provide: ResumeEventPublisher,
      useFactory: (eventPublisher: EventPublisher) =>
        new ResumeEventPublisherAdapter(eventPublisher),
      inject: [EventPublisher],
    },
    {
      provide: ResumeVersionsUseCases,
      useFactory: (
        prisma: PrismaService,
        logger: LoggerPort,
        llm: LlmPort,
        events: ResumeEventPublisher,
      ) => buildResumeVersionsUseCases(prisma, logger, llm, events),
      inject: [PrismaService, LoggerPort, LlmPort, ResumeEventPublisher],
    },
    {
      provide: ResumeVersionService,
      useFactory: (bc: ResumeVersionsUseCases) =>
        new ResumeVersionService(bc.createSnapshot, bc.getVersions, bc.restoreVersion),
      inject: [ResumeVersionsUseCases],
    },
    {
      provide: ResumeTailorService,
      useFactory: (bc: ResumeVersionsUseCases) =>
        new ResumeTailorService(
          bc.tailorResumeForJob,
          bc.getTailoredVersions,
          bc.getTailoredVersionDiff,
        ),
      inject: [ResumeVersionsUseCases],
    },
    { provide: ResumeVersionServicePort, useExisting: ResumeVersionService },
  ],
  exports: [
    ResumeVersionService,
    ResumeVersionServicePort,
    ResumeTailorService,
    ResumeEventPublisher,
    ResumeVersionsUseCases,
  ],
})
export class ResumeVersionsModule {}
