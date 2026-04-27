/**
 * Platform Module
 *
 * Thin Nest shell over `buildPlatformUseCases`. All wiring for the
 * four POJO use-case slices (admin-dashboard, admin-alerts,
 * platform-stats, enums) lives in `platform.composition.ts`. The
 * cross-cutting infrastructure (cache, email, logger, audit,
 * idempotency, rate-limit, s3-upload, markdown transformer, etc.)
 * lives in dedicated modules elsewhere under `platform/common/`.
 */

import { Module } from '@nestjs/common';
import {
  AuthorizationModule,
  AuthorizationService,
} from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumesCoreModule } from '@/bounded-contexts/resumes/core/resumes.module';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import { LoggerPort } from '@/shared-kernel';
import { PlatformUseCases } from './application/ports/platform.port';
import { AdminAlertsController } from './infrastructure/controllers/admin-alerts.controller';
import { AdminDashboardController } from './infrastructure/controllers/admin-dashboard.controller';
import { EnumsController } from './infrastructure/controllers/enums.controller';
import { PlatformStatsController } from './infrastructure/controllers/platform-stats.controller';
import { buildPlatformUseCases } from './platform.composition';

@Module({
  imports: [PrismaModule, AuthorizationModule, ResumesCoreModule],
  controllers: [
    PlatformStatsController,
    EnumsController,
    AdminDashboardController,
    AdminAlertsController,
  ],
  providers: [
    SectionTypeRepository,
    {
      provide: PlatformUseCases,
      useFactory: (
        prisma: PrismaService,
        logger: LoggerPort,
        authorization: AuthorizationService,
        sectionTypeRepository: SectionTypeRepository,
      ) => buildPlatformUseCases(prisma, logger, authorization, sectionTypeRepository),
      inject: [PrismaService, LoggerPort, AuthorizationService, SectionTypeRepository],
    },
  ],
  exports: [PlatformUseCases],
})
export class PlatformModule {}
