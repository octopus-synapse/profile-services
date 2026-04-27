/**
 * MEC Sync Module
 *
 * Thin Nest shell over `buildMecSyncUseCases`. All wiring lives in
 * `mec-sync.composition.ts`.
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { MecSyncUseCases } from './application/ports/mec-sync.port';
import { MecCourseController } from './infrastructure/controllers/mec-course.controller';
import { MecInstitutionController } from './infrastructure/controllers/mec-institution.controller';
import { MecMetadataController } from './infrastructure/controllers/mec-metadata.controller';
import { MecSyncInternalController } from './infrastructure/controllers/mec-sync-internal.controller';
import { buildMecSyncUseCases } from './mec-sync.composition';

@Module({
  imports: [PrismaModule, CacheModule, LoggerModule],
  controllers: [
    MecSyncInternalController,
    MecInstitutionController,
    MecCourseController,
    MecMetadataController,
  ],
  providers: [
    {
      provide: MecSyncUseCases,
      useFactory: (prisma: PrismaService, cache: CacheService, logger: LoggerPort) =>
        buildMecSyncUseCases(prisma, cache, logger),
      inject: [PrismaService, CacheService, LoggerPort],
    },
  ],
  exports: [MecSyncUseCases],
})
export class MecSyncModule {}
