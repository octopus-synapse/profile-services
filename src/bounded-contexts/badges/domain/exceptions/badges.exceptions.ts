/**
 * Badges Bounded Context Exceptions
 */
import { ConflictException, ValidationException } from '@/shared-kernel/exceptions';

export class BadgeAlreadyAwardedException extends ConflictException {
  override readonly code: string = 'BADGE_ALREADY_AWARDED';
  constructor(badgeKey: string) {
    super(`Badge "${badgeKey}" is already awarded to this user`);
  }
}

export class BadgeCriteriaNotMetException extends ValidationException {
  override readonly code: string = 'BADGE_CRITERIA_NOT_MET';
  constructor(badgeKey: string) {
    super(`Criteria for badge "${badgeKey}" are not satisfied`);
  }
}
