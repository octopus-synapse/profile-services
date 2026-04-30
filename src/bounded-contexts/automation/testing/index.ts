/**
 * Testing doubles for the automation bounded context. Each in-memory
 * repository mirrors the behavior of its production Prisma adapter so
 * use case specs run without a database.
 */

export { InMemoryApplyModeRepository } from './in-memory-apply-mode.repository';
