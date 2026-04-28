/**
 * Pure-TS wiring for the platform/audit BC. Zero `@nestjs/*` imports.
 *
 * `AuditLogService` is a small POJO consumed directly by other BCs
 * (onboarding, feature-flags, account-lifecycle) as a service type.
 * The composition just news it up; there is no use-case bundle nor
 * routes (audit has no HTTP surface of its own).
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { AuditLogService } from './audit-log.service';

export { AuditLogService };

export function buildAuditLogService(prisma: PrismaService, logger: LoggerPort): AuditLogService {
  return new AuditLogService(prisma, logger);
}
