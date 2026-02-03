/**
 * MEC Sync Module
 * Clean Architecture: Controllers -> Services -> Repositories
 */

import { Module } from '@nestjs/common';

// Controllers
import {
  MecSyncInternalController,
  MecInstitutionController,
  MecCourseController,
  MecMetadataController,
} from './controllers';

// Repositories
import {
  InstitutionRepository,
  CourseRepository,
  SyncLogRepository,
} from './repositories';

// Services
import {
  InstitutionQueryService,
  CourseQueryService,
  MecStatsService,
  MecSyncOrchestratorService,
  DataSyncService,
  SyncHelperService,
  MecCsvParserService,
  CsvFileCacheService,
  CsvDownloaderService,
  CsvEncodingService,
  CsvRowProcessorService,
  CloudflareHandlerService,
} from './services';

// Shared modules
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';

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
