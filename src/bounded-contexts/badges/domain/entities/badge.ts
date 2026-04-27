/**
 * Domain shape for an awarded badge. Mirrors the persistence row but
 * stays decoupled so the storage layer can evolve without rippling.
 */

import type { BadgeKind } from '@prisma/client';

export interface AwardedBadge {
  readonly kind: BadgeKind;
  readonly awardedAt: Date;
  readonly context: unknown;
}

export interface AwardedBadgeView {
  readonly kind: string;
  readonly awardedAt: string;
}
