import { Module } from '@nestjs/common';
import { ExportModule } from '@/bounded-contexts/export/export.module';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization/authorization.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventPublisher, LoggerPort } from '@/shared-kernel';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { ResumeStylesUseCases } from './application/ports/resume-styles.port';
import { ResumeStyleRepositoryPort } from './domain/ports/resume-style.repository.port';
import { StylePreviewPort } from './domain/ports/style-preview.port';
import { StyleScorerPort } from './domain/ports/style-scorer.port';
import { PrismaResumeStyleRepository } from './infrastructure/adapters/persistence/prisma-resume-style.repository';
import { StylePreviewAdapter } from './infrastructure/adapters/style-preview.adapter';
import { StyleScorerAdapter } from './infrastructure/adapters/style-scorer.adapter';
import { buildResumeStylesUseCases } from './resume-styles.composition';
import { resumeStylesRoutes } from './resume-styles.routes';

/**
 * resume-styles/ — owner of the `ResumeStyle` aggregate.
 *
 * Public surface: list / detail / preview / apply.
 * Admin surface: create / update / delete with the ATS-safety
 * threshold + monotonic-score invariants enforced at the use-case
 * layer (and a Postgres trigger as the floor).
 *
 * Every endpoint — including the binary preview PDF — is now
 * synthesized from `resume-styles.routes.ts`.
 */
@Module({
  imports: [PrismaModule, EventBusModule, AuthorizationModule, ExportModule],
  controllers: [...synthesizeRouteControllers(ResumeStylesUseCases, resumeStylesRoutes)],
  providers: [
    StyleScorerAdapter,
    StylePreviewAdapter,
    PrismaResumeStyleRepository,
    {
      provide: ResumeStylesUseCases,
      useFactory: (
        repo: ResumeStyleRepositoryPort,
        scorer: StyleScorerPort,
        preview: StylePreviewPort,
        events: EventPublisher,
        logger: LoggerPort,
      ) => buildResumeStylesUseCases(repo, scorer, preview, events, logger),
      inject: [
        ResumeStyleRepositoryPort,
        StyleScorerPort,
        StylePreviewPort,
        EventPublisher,
        LoggerPort,
      ],
    },
    { provide: StyleScorerPort, useExisting: StyleScorerAdapter },
    { provide: StylePreviewPort, useExisting: StylePreviewAdapter },
    { provide: ResumeStyleRepositoryPort, useExisting: PrismaResumeStyleRepository },
  ],
  exports: [StyleScorerPort, ResumeStyleRepositoryPort],
})
export class ResumeStylesModule {}
