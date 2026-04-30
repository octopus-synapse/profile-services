/**
 * Idempotent badge award. The repository absorbs the unique-
 * constraint violation; a re-award returns `{ awarded: false }`
 * so callers (event handlers) can branch without exceptions.
 */

import type { BadgeKind, Prisma } from '@prisma/client';
import type { LoggerPort } from '@/shared-kernel';
import { BadgesRepositoryPort } from '../../../domain/ports/badges.repository.port';

const CTX = 'AwardBadgeUseCase';

export class AwardBadgeUseCase {
  constructor(
    private readonly repository: BadgesRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    userId: string,
    kind: BadgeKind,
    context?: Prisma.InputJsonValue,
  ): Promise<{ awarded: boolean }> {
    const result = await this.repository.award(userId, kind, context);
    if (result.awarded) this.logger.log(`Awarded ${kind} to ${userId}`, CTX);
    return result;
  }
}
