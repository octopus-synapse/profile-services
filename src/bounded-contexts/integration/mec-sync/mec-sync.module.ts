/**
 * MEC Sync Module
 *
 * ADR-001: Hexagonal layout. The 4 controllers are driven by 12 POJO
 * use cases that delegate into the application services
 * (`MecSyncService`, the parser pipeline, the query services, the
 * stats service). Outbound I/O lives behind 5 ports —
 * `MecCachePort`, `MecCsvDownloaderPort`,
 * `MecInstitutionRepositoryPort`, `MecCourseRepositoryPort`,
 * `MecSyncLogRepositoryPort`. Adapters wire them in via `useFactory`.
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { CourseQueryService } from './application/services/course-query.service';
import { CsvEncodingService } from './application/services/csv-encoding.service';
import { CsvFileCacheService } from './application/services/csv-file-cache.service';
import { CsvRowProcessorService } from './application/services/csv-row-processor.service';
import { DataSyncService } from './application/services/data-sync.service';
import { InstitutionQueryService } from './application/services/institution-query.service';
import { MecCsvParserService } from './application/services/mec-csv-parser.service';
import { MecStatsService } from './application/services/mec-stats.service';
import { MecSyncService } from './application/services/mec-sync.service';
import { SyncHelperService } from './application/services/sync-helper.service';
import { GetCourseByCodeUseCase } from './application/use-cases/get-course-by-code/get-course-by-code.use-case';
import { GetInstitutionByCodeUseCase } from './application/use-cases/get-institution-by-code/get-institution-by-code.use-case';
import { GetMecStatisticsUseCase } from './application/use-cases/get-mec-statistics/get-mec-statistics.use-case';
import { GetSyncHistoryUseCase } from './application/use-cases/get-sync-history/get-sync-history.use-case';
import { GetSyncStatusUseCase } from './application/use-cases/get-sync-status/get-sync-status.use-case';
import { ListCoursesByInstitutionUseCase } from './application/use-cases/list-courses-by-institution/list-courses-by-institution.use-case';
import { ListInstitutionsUseCase } from './application/use-cases/list-institutions/list-institutions.use-case';
import { ListKnowledgeAreasUseCase } from './application/use-cases/list-knowledge-areas/list-knowledge-areas.use-case';
import { ListStateCodesUseCase } from './application/use-cases/list-state-codes/list-state-codes.use-case';
import { SearchCoursesUseCase } from './application/use-cases/search-courses/search-courses.use-case';
import { SearchInstitutionsUseCase } from './application/use-cases/search-institutions/search-institutions.use-case';
import { TriggerMecSyncUseCase } from './application/use-cases/trigger-mec-sync/trigger-mec-sync.use-case';
import { MecCachePort } from './domain/ports/mec-cache.port';
import { MecCourseRepositoryPort } from './domain/ports/mec-course.repository.port';
import { MecCsvDownloaderPort } from './domain/ports/mec-csv-downloader.port';
import { MecInstitutionRepositoryPort } from './domain/ports/mec-institution.repository.port';
import { MecSyncLogRepositoryPort } from './domain/ports/mec-sync-log.repository.port';
import { CloudflareBypassAdapter } from './infrastructure/adapters/external-services/cloudflare-bypass.adapter';
import { PuppeteerMecCsvDownloaderAdapter } from './infrastructure/adapters/external-services/puppeteer-mec-csv-downloader.adapter';
import { RedisMecCacheAdapter } from './infrastructure/adapters/external-services/redis-mec-cache.adapter';
import { PrismaMecCourseRepository } from './infrastructure/adapters/persistence/prisma-mec-course.repository';
import { PrismaMecInstitutionRepository } from './infrastructure/adapters/persistence/prisma-mec-institution.repository';
import { PrismaMecSyncLogRepository } from './infrastructure/adapters/persistence/prisma-mec-sync-log.repository';
import { MecCourseController } from './infrastructure/controllers/mec-course.controller';
import { MecInstitutionController } from './infrastructure/controllers/mec-institution.controller';
import { MecMetadataController } from './infrastructure/controllers/mec-metadata.controller';
import { MecSyncInternalController } from './infrastructure/controllers/mec-sync-internal.controller';

@Module({
  imports: [PrismaModule, CacheModule, LoggerModule],
  controllers: [
    MecSyncInternalController,
    MecInstitutionController,
    MecCourseController,
    MecMetadataController,
  ],
  providers: [
    // ---- Outbound port adapters ----
    {
      provide: MecCachePort,
      useFactory: (cache: CacheService) => new RedisMecCacheAdapter(cache),
      inject: [CacheService],
    },
    {
      provide: MecInstitutionRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaMecInstitutionRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: MecCourseRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaMecCourseRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: MecSyncLogRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaMecSyncLogRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: CloudflareBypassAdapter,
      useFactory: (logger: LoggerPort) => new CloudflareBypassAdapter(logger),
      inject: [LoggerPort],
    },
    {
      provide: MecCsvDownloaderPort,
      useFactory: (logger: LoggerPort, cloudflare: CloudflareBypassAdapter) =>
        new PuppeteerMecCsvDownloaderAdapter(logger, cloudflare),
      inject: [LoggerPort, CloudflareBypassAdapter],
    },

    // ---- Application services ----
    {
      provide: CsvEncodingService,
      useFactory: (logger: LoggerPort) => new CsvEncodingService(logger),
      inject: [LoggerPort],
    },
    {
      provide: CsvFileCacheService,
      useFactory: (logger: LoggerPort) => new CsvFileCacheService(logger),
      inject: [LoggerPort],
    },
    {
      provide: CsvRowProcessorService,
      useFactory: (logger: LoggerPort) => new CsvRowProcessorService(logger),
      inject: [LoggerPort],
    },
    {
      provide: MecCsvParserService,
      useFactory: (
        logger: LoggerPort,
        fileCache: CsvFileCacheService,
        downloader: MecCsvDownloaderPort,
        encoding: CsvEncodingService,
        rowProcessor: CsvRowProcessorService,
      ) => new MecCsvParserService(logger, fileCache, downloader, encoding, rowProcessor),
      inject: [
        LoggerPort,
        CsvFileCacheService,
        MecCsvDownloaderPort,
        CsvEncodingService,
        CsvRowProcessorService,
      ],
    },
    {
      provide: DataSyncService,
      useFactory: (
        logger: LoggerPort,
        cache: MecCachePort,
        institutionRepo: MecInstitutionRepositoryPort,
        courseRepo: MecCourseRepositoryPort,
      ) => new DataSyncService(logger, cache, institutionRepo, courseRepo),
      inject: [LoggerPort, MecCachePort, MecInstitutionRepositoryPort, MecCourseRepositoryPort],
    },
    {
      provide: SyncHelperService,
      useFactory: (
        logger: LoggerPort,
        cache: MecCachePort,
        syncLogRepo: MecSyncLogRepositoryPort,
      ) => new SyncHelperService(logger, cache, syncLogRepo),
      inject: [LoggerPort, MecCachePort, MecSyncLogRepositoryPort],
    },
    {
      provide: MecSyncService,
      useFactory: (
        logger: LoggerPort,
        cache: MecCachePort,
        parser: MecCsvParserService,
        dataSync: DataSyncService,
        helper: SyncHelperService,
        syncLogRepo: MecSyncLogRepositoryPort,
      ) => new MecSyncService(logger, cache, parser, dataSync, helper, syncLogRepo),
      inject: [
        LoggerPort,
        MecCachePort,
        MecCsvParserService,
        DataSyncService,
        SyncHelperService,
        MecSyncLogRepositoryPort,
      ],
    },
    {
      provide: InstitutionQueryService,
      useFactory: (logger: LoggerPort, repo: MecInstitutionRepositoryPort, cache: MecCachePort) =>
        new InstitutionQueryService(logger, repo, cache),
      inject: [LoggerPort, MecInstitutionRepositoryPort, MecCachePort],
    },
    {
      provide: CourseQueryService,
      useFactory: (logger: LoggerPort, repo: MecCourseRepositoryPort, cache: MecCachePort) =>
        new CourseQueryService(logger, repo, cache),
      inject: [LoggerPort, MecCourseRepositoryPort, MecCachePort],
    },
    {
      provide: MecStatsService,
      useFactory: (
        logger: LoggerPort,
        institutionRepo: MecInstitutionRepositoryPort,
        courseRepo: MecCourseRepositoryPort,
      ) => new MecStatsService(logger, institutionRepo, courseRepo),
      inject: [LoggerPort, MecInstitutionRepositoryPort, MecCourseRepositoryPort],
    },

    // ---- Use cases ----
    {
      provide: SearchCoursesUseCase,
      useFactory: (q: CourseQueryService) => new SearchCoursesUseCase(q),
      inject: [CourseQueryService],
    },
    {
      provide: GetCourseByCodeUseCase,
      useFactory: (q: CourseQueryService) => new GetCourseByCodeUseCase(q),
      inject: [CourseQueryService],
    },
    {
      provide: ListInstitutionsUseCase,
      useFactory: (q: InstitutionQueryService) => new ListInstitutionsUseCase(q),
      inject: [InstitutionQueryService],
    },
    {
      provide: SearchInstitutionsUseCase,
      useFactory: (q: InstitutionQueryService) => new SearchInstitutionsUseCase(q),
      inject: [InstitutionQueryService],
    },
    {
      provide: GetInstitutionByCodeUseCase,
      useFactory: (q: InstitutionQueryService) => new GetInstitutionByCodeUseCase(q),
      inject: [InstitutionQueryService],
    },
    {
      provide: ListCoursesByInstitutionUseCase,
      useFactory: (q: CourseQueryService) => new ListCoursesByInstitutionUseCase(q),
      inject: [CourseQueryService],
    },
    {
      provide: ListStateCodesUseCase,
      useFactory: (q: InstitutionQueryService) => new ListStateCodesUseCase(q),
      inject: [InstitutionQueryService],
    },
    {
      provide: ListKnowledgeAreasUseCase,
      useFactory: (q: CourseQueryService) => new ListKnowledgeAreasUseCase(q),
      inject: [CourseQueryService],
    },
    {
      provide: GetMecStatisticsUseCase,
      useFactory: (s: MecStatsService) => new GetMecStatisticsUseCase(s),
      inject: [MecStatsService],
    },
    {
      provide: TriggerMecSyncUseCase,
      useFactory: (s: MecSyncService) => new TriggerMecSyncUseCase(s),
      inject: [MecSyncService],
    },
    {
      provide: GetSyncStatusUseCase,
      useFactory: (s: MecSyncService) => new GetSyncStatusUseCase(s),
      inject: [MecSyncService],
    },
    {
      provide: GetSyncHistoryUseCase,
      useFactory: (s: MecSyncService) => new GetSyncHistoryUseCase(s),
      inject: [MecSyncService],
    },
  ],
  exports: [InstitutionQueryService, CourseQueryService, MecStatsService],
})
export class MecSyncModule {}
