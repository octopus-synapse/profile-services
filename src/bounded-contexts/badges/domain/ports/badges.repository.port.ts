/**
 * Outbound port for badge persistence.
 *
 * `award` returns whether the row was actually inserted. Adapters MUST
 * treat a unique-constraint collision on `(userId, kind)` as
 * idempotent — the use case interprets `awarded: false` as "already
 * owned" rather than an error.
 */

import type { BadgeKind, Prisma } from '@prisma/client';
import type { AwardedBadge } from '../entities/badge';

export abstract class BadgesRepositoryPort {
  abstract listForUser(userId: string): Promise<AwardedBadge[]>;
  abstract listForManyUsers(userIds: string[]): Promise<Map<string, BadgeKind[]>>;
  abstract award(
    userId: string,
    kind: BadgeKind,
    context?: Prisma.InputJsonValue,
  ): Promise<{ awarded: boolean }>;
  abstract countAcceptedApplications(userId: string): Promise<number>;
}
