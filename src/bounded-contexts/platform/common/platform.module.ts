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
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { PlatformUseCases } from './application/ports/platform.port';
import { buildPlatformUseCases } from './platform.composition';
import { platformRoutes } from './platform.routes';

@Module({
  imports: [PrismaModule, AuthorizationModule, ResumesCoreModule],
  controllers: synthesizeRouteControllers(PlatformUseCases, platformRoutes),
  providers: [
    SectionTypeRepository,
    {
      provide: 'SECTION_TYPE_REPOSITORY_INIT',
      useFactory: async (svc: SectionTypeRepository) => {
        await svc.init?.();
        return true;
      },
      inject: [SectionTypeRepository],
    },
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
