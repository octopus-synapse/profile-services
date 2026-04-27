/**
 * Bundle token for the mec-sync BC. Doubles as the TypeScript shape
 * and the Nest DI token. Wiring lives in `mec-sync.composition.ts` —
 * Nest-free.
 */

import type { GetCourseByCodeUseCase } from '../use-cases/get-course-by-code/get-course-by-code.use-case';
import type { GetInstitutionByCodeUseCase } from '../use-cases/get-institution-by-code/get-institution-by-code.use-case';
import type { GetMecStatisticsUseCase } from '../use-cases/get-mec-statistics/get-mec-statistics.use-case';
import type { GetSyncHistoryUseCase } from '../use-cases/get-sync-history/get-sync-history.use-case';
import type { GetSyncStatusUseCase } from '../use-cases/get-sync-status/get-sync-status.use-case';
import type { ListCoursesByInstitutionUseCase } from '../use-cases/list-courses-by-institution/list-courses-by-institution.use-case';
import type { ListInstitutionsUseCase } from '../use-cases/list-institutions/list-institutions.use-case';
import type { ListKnowledgeAreasUseCase } from '../use-cases/list-knowledge-areas/list-knowledge-areas.use-case';
import type { ListStateCodesUseCase } from '../use-cases/list-state-codes/list-state-codes.use-case';
import type { SearchCoursesUseCase } from '../use-cases/search-courses/search-courses.use-case';
import type { SearchInstitutionsUseCase } from '../use-cases/search-institutions/search-institutions.use-case';
import type { TriggerMecSyncUseCase } from '../use-cases/trigger-mec-sync/trigger-mec-sync.use-case';

export abstract class MecSyncUseCases {
  // Course
  abstract readonly searchCourses: SearchCoursesUseCase;
  abstract readonly getCourseByCode: GetCourseByCodeUseCase;
  abstract readonly listCoursesByInstitution: ListCoursesByInstitutionUseCase;

  // Institution
  abstract readonly listInstitutions: ListInstitutionsUseCase;
  abstract readonly searchInstitutions: SearchInstitutionsUseCase;
  abstract readonly getInstitutionByCode: GetInstitutionByCodeUseCase;

  // Metadata
  abstract readonly listStateCodes: ListStateCodesUseCase;
  abstract readonly listKnowledgeAreas: ListKnowledgeAreasUseCase;
  abstract readonly getMecStatistics: GetMecStatisticsUseCase;

  // Sync internal
  abstract readonly triggerMecSync: TriggerMecSyncUseCase;
  abstract readonly getSyncStatus: GetSyncStatusUseCase;
  abstract readonly getSyncHistory: GetSyncHistoryUseCase;
}
