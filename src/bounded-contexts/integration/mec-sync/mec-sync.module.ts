/**
 * MEC Sync Module
 * Clean Architecture: Controllers -> Services -> Repositories
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
// Shared modules
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
// Controllers
import {
  MecCourseController,
  MecInstitutionController,
  MecMetadataController,
  MecSyncInternalController,
} from './controllers';
// Repositories
import { CourseRepository, InstitutionRepository, SyncLogRepository } from './repositories';
// Services
import {
  CloudflareHandlerService,
  CourseQueryService,
  CsvDownloaderService,
  CsvEncodingService,
  CsvFileCacheService,
  CsvRowProcessorService,
  DataSyncService,
  InstitutionQueryService,
  MecCsvParserService,
  MecStatsService,
  MecSyncOrchestratorService,
  SyncHelperService,
} from './services';

@Module({
  imports: [PrismaModule, CacheModule, LoggerModule],
  controllers: [
    MecSyncInternalController,
    MecInstitutionController,
    MecCourseController,
    MecMetadataController,
  ],
  providers: [
    // Repositories
    InstitutionRepository,
    CourseRepository,
    SyncLogRepository,

    // Query Services
    InstitutionQueryService,
    CourseQueryService,
    MecStatsService,

    // Sync Services
    MecSyncOrchestratorService,
    DataSyncService,
    SyncHelperService,
    MecCsvParserService,
    CsvFileCacheService,
    CsvDownloaderService,
    CsvEncodingService,
    CsvRowProcessorService,
    CloudflareHandlerService,
  ],
  exports: [InstitutionQueryService, CourseQueryService, MecStatsService],
})
export class MecSyncModule {}
