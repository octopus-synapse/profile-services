import { Module } from '@nestjs/common';
import { ExportModule } from '@/bounded-contexts/export/export.module';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization/authorization.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { CreateStyleUseCase } from './application/use-cases/admin/create-style.use-case';
import { DeleteStyleUseCase } from './application/use-cases/admin/delete-style.use-case';
import { UpdateStyleUseCase } from './application/use-cases/admin/update-style.use-case';
import { ApplyStyleToResumeUseCase } from './application/use-cases/apply-style-to-resume.use-case';
import { GetStyleUseCase } from './application/use-cases/get-style.use-case';
import { ListStylesUseCase } from './application/use-cases/list-styles.use-case';
import { PreviewStyleUseCase } from './application/use-cases/preview-style.use-case';
import { ResumeStyleRepositoryPort } from './domain/ports/resume-style.repository.port';
import { StylePreviewPort } from './domain/ports/style-preview.port';
import { StyleScorerPort } from './domain/ports/style-scorer.port';
import { PrismaResumeStyleRepository } from './infrastructure/adapters/persistence/prisma-resume-style.repository';
import { StylePreviewAdapter } from './infrastructure/adapters/style-preview.adapter';
import { StyleScorerAdapter } from './infrastructure/adapters/style-scorer.adapter';
import { AdminResumeStylesController } from './infrastructure/controllers/admin-resume-styles.controller';
import { ResumeStylesController } from './infrastructure/controllers/resume-styles.controller';

/**
 * resume-styles/ — owner of the `ResumeStyle` aggregate.
 *
 * Public surface: list / detail / preview / apply.
 * Admin surface: create / update / delete with the ATS-safety
 * threshold + monotonic-score invariants enforced at the use-case
 * layer (and a Postgres trigger as the floor).
 */
@Module({
  imports: [PrismaModule, EventBusModule, AuthorizationModule, ExportModule],
  controllers: [ResumeStylesController, AdminResumeStylesController],
  providers: [
    StyleScorerAdapter,
    StylePreviewAdapter,
    PrismaResumeStyleRepository,
    ListStylesUseCase,
    GetStyleUseCase,
    PreviewStyleUseCase,
    ApplyStyleToResumeUseCase,
    CreateStyleUseCase,
    UpdateStyleUseCase,
    DeleteStyleUseCase,
    { provide: StyleScorerPort, useExisting: StyleScorerAdapter },
    { provide: StylePreviewPort, useExisting: StylePreviewAdapter },
    { provide: ResumeStyleRepositoryPort, useExisting: PrismaResumeStyleRepository },
  ],
  exports: [StyleScorerPort, ResumeStyleRepositoryPort],
})
export class ResumeStylesModule {}
