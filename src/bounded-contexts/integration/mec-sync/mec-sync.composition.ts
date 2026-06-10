/**
 * Pure-TS wiring for the mec-sync BC. Zero `@nestjs/*` imports.
 *
 * The composition assembles the parser pipeline, the query/stats
 * services, the sync orchestrator, and all 12 use cases — same graph
 * as the original module but freed from Nest's DI container.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import { MecSyncUseCases } from './application/ports/mec-sync.port';
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
import { CloudflareBypassAdapter } from './infrastructure/adapters/external-services/cloudflare-bypass.adapter';
import { PuppeteerMecCsvDownloaderAdapter } from './infrastructure/adapters/external-services/puppeteer-mec-csv-downloader.adapter';
import { RedisMecCacheAdapter } from './infrastructure/adapters/external-services/redis-mec-cache.adapter';
import { PrismaMecCourseRepository } from './infrastructure/adapters/persistence/prisma-mec-course.repository';
import { PrismaMecInstitutionRepository } from './infrastructure/adapters/persistence/prisma-mec-institution.repository';
import { PrismaMecSyncLogRepository } from './infrastructure/adapters/persistence/prisma-mec-sync-log.repository';

export { MecSyncUseCases };

export function buildMecSyncUseCases(
  prisma: PrismaService,
  cache: CachePort,
  logger: LoggerPort,
): MecSyncUseCases {
  // Outbound adapters
  const mecCache = new RedisMecCacheAdapter(cache);
  const institutionRepo = new PrismaMecInstitutionRepository(prisma, logger);
  const courseRepo = new PrismaMecCourseRepository(prisma, logger);
  const syncLogRepo = new PrismaMecSyncLogRepository(prisma, logger);
  const cloudflare = new CloudflareBypassAdapter(logger);
  const csvDownloader = new PuppeteerMecCsvDownloaderAdapter(logger, cloudflare);

  // Application services
  const csvEncoding = new CsvEncodingService(logger);
  const csvFileCache = new CsvFileCacheService(logger);
  const csvRowProcessor = new CsvRowProcessorService(logger);
  const csvParser = new MecCsvParserService(
    logger,
    csvFileCache,
    csvDownloader,
    csvEncoding,
    csvRowProcessor,
  );
  const dataSync = new DataSyncService(logger, mecCache, institutionRepo, courseRepo);
  const syncHelper = new SyncHelperService(logger, mecCache, syncLogRepo);
  const syncService = new MecSyncService(
    logger,
    mecCache,
    csvParser,
    dataSync,
    syncHelper,
    syncLogRepo,
  );
  const institutionQuery = new InstitutionQueryService(logger, institutionRepo, mecCache);
  const courseQuery = new CourseQueryService(logger, courseRepo, mecCache);
  const stats = new MecStatsService(logger, institutionRepo, courseRepo);

  return {
    // Course
    searchCourses: new SearchCoursesUseCase(courseQuery),
    getCourseByCode: new GetCourseByCodeUseCase(courseQuery),
    listCoursesByInstitution: new ListCoursesByInstitutionUseCase(courseQuery),

    // Institution
    listInstitutions: new ListInstitutionsUseCase(institutionQuery),
    searchInstitutions: new SearchInstitutionsUseCase(institutionQuery),
    getInstitutionByCode: new GetInstitutionByCodeUseCase(institutionQuery),

    // Metadata
    listStateCodes: new ListStateCodesUseCase(institutionQuery),
    listKnowledgeAreas: new ListKnowledgeAreasUseCase(courseQuery),
    getMecStatistics: new GetMecStatisticsUseCase(stats),

    // Sync internal
    triggerMecSync: new TriggerMecSyncUseCase(syncService),
    getSyncStatus: new GetSyncStatusUseCase(syncService),
    getSyncHistory: new GetSyncHistoryUseCase(syncService),
  };
}
