/**
 * Test doubles for the MEC bounded context. Each in-memory adapter
 * extends the corresponding port so use case + service specs can wire
 * them in without spinning up Prisma or puppeteer.
 */

export { InMemoryMecCache } from './in-memory-mec-cache';
export {
  InMemoryMecCourseRepository,
  InMemoryMecInstitutionRepository,
} from './in-memory-mec-repositories';
export { InMemoryMecSyncLogRepository } from './in-memory-mec-sync-log.repository';
