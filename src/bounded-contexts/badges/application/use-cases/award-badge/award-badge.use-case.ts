/**
 * Idempotent badge award. The repository absorbs the unique-
 * constraint violation; a re-award returns `{ awarded: false }`
 * so callers (event handlers) can branch without exceptions.
 *
 * Strict mode (`opts.strict === true`) flips the behaviour so direct
 * award attempts (e.g. admin tools, explicit user-driven claims) raise
 * `BadgeCriteriaNotMetException` when `criteriaMet` is `false` and
 * `BadgeAlreadyAwardedException` when the row already exists. Event
 * handlers MUST keep the default loose mode.
 */

import type { BadgeKind, Prisma } from '@prisma/client';
import type { LoggerPort } from '@/shared-kernel';
import {
  BadgeAlreadyAwardedException,
  BadgeCriteriaNotMetException,
} from '../../../domain/exceptions/badges.exceptions';
import { BadgesRepositoryPort } from '../../../domain/ports/badges.repository.port';

const CTX = 'AwardBadgeUseCase';

export interface AwardBadgeOptions {
  strict?: boolean;
  criteriaMet?: boolean;
}

export class AwardBadgeUseCase {
  constructor(
    private readonly repository: BadgesRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    userId: string,
    kind: BadgeKind,
    context?: Prisma.InputJsonValue,
    opts: AwardBadgeOptions = {},
  ): Promise<{ awarded: boolean }> {
    if (opts.strict && opts.criteriaMet === false) {
      throw new BadgeCriteriaNotMetException(kind);
    }
    const result = await this.repository.award(userId, kind, context);
    if (opts.strict && !result.awarded) {
      throw new BadgeAlreadyAwardedException(kind);
    }
    if (result.awarded) this.logger.log(`Awarded ${kind} to ${userId}`, CTX);
    return result;
  }
}
