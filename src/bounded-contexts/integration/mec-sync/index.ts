/**
 * MEC Sync — public surface for cross-BC consumers.
 *
 * ADR-001 layout: domain (entities + ports), application (services +
 * use cases), infrastructure (controllers + adapters + guards).
 */

export * from '@/shared-kernel';
export { CourseQueryService } from './application/services/course-query.service';
export { InstitutionQueryService } from './application/services/institution-query.service';
export { MecStatsService } from './application/services/mec-stats.service';
