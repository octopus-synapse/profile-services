/**
 * Themes Bounded Context Exceptions
 */
import {
  ConflictException,
  DomainException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class ThemeSlugTakenException extends ConflictException {
  readonly code: string = 'THEME_SLUG_TAKEN';
  constructor(slug: string) {
    super(`Theme slug "${slug}" is already taken`);
  }
}

export class ThemeNotOwnedException extends DomainException {
  readonly code: string = 'THEME_NOT_OWNED';
  readonly statusHint = 403;
  constructor() {
    super('You can only modify your own themes');
  }
}

export class ThemeAlreadyPublishedException extends ConflictException {
  readonly code: string = 'THEME_ALREADY_PUBLISHED';
  constructor() {
    super('Theme is already published');
  }
}

export class ThemeApprovalPendingException extends ConflictException {
  readonly code: string = 'THEME_APPROVAL_PENDING';
  constructor() {
    super('Theme is already pending approval');
  }
}

export class ThemeInvalidException extends ValidationException {
  readonly code: string = 'THEME_INVALID';
  constructor(reason: string) {
    super(`Theme is invalid: ${reason}`);
  }
}
