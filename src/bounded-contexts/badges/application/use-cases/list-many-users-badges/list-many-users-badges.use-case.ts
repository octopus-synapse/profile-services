/**
 * Bulk read used by feed/profile fan-out: returns a map keyed by
 * userId of the BadgeKind list owned. Empty input → empty map.
 */

import type { BadgeKind } from '@prisma/client';
import { BadgesRepositoryPort } from '../../../domain/ports/badges.repository.port';

export class ListManyUsersBadgesUseCase {
  constructor(private readonly repository: BadgesRepositoryPort) {}

  execute(userIds: string[]): Promise<Map<string, BadgeKind[]>> {
    return this.repository.listForManyUsers(userIds);
  }
}
