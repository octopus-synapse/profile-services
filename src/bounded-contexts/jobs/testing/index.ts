/**
 * In-memory test doubles for the jobs/tracker ports. Re-exported via
 * a barrel so specs can import everything from
 * `@/bounded-contexts/jobs/testing` without knowing the internal
 * layout.
 */

export { InMemoryAntiGhostingRepository } from './in-memory-anti-ghosting.repository';
export { InMemoryAntiGhostingEmailer } from './in-memory-anti-ghosting-emailer';
export { InMemoryApplicationTrackerRepository } from './in-memory-application-tracker.repository';
export { InMemoryJobsRepository } from './in-memory-jobs.repository';
