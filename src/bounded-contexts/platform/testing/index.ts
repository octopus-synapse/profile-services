/**
 * Platform Testing Module
 *
 * In-memory implementations for testing platform services.
 * Following clean architecture principles - ports and adapters.
 *
 * Patterns:
 * - InMemory repositories for webhooks, audit logs, email logs
 * - Factory functions for creating test data
 * - Stub logger for capturing log output
 */

export { createTestAuditLog } from './factories/audit-log.factory';
export { createTestEmailLog } from './factories/email-log.factory';
// Factories
export { createTestWebhook } from './factories/webhook.factory';
export { InMemoryAuditLogRepository } from './repositories/in-memory-audit-log.repository';
export { InMemoryEmailLogRepository } from './repositories/in-memory-email-log.repository';
// Repositories
export { InMemoryWebhookRepository } from './repositories/in-memory-webhook.repository';
// Utilities
export { StubLogger } from './stub-logger';
