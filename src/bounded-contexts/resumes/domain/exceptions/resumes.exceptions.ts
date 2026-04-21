/**
 * Resumes Bounded Context Exceptions
 */
import {
  ConflictException,
  DomainException,
  ForbiddenException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class ResumeNotOwnedException extends ForbiddenException {
  readonly code: string = 'RESUME_NOT_OWNED';
  constructor() {
    super('You can only modify your own resume');
  }
}

export class ResumeSlotLimitReachedException extends ConflictException {
  readonly code: string = 'RESUME_SLOT_LIMIT_REACHED';
  constructor(max: number) {
    super(`Resume slot limit reached (${max})`);
  }
}

export class ResumeSectionInvalidException extends ValidationException {
  readonly code: string = 'RESUME_SECTION_INVALID';
  constructor(reason: string) {
    super(`Resume section is invalid: ${reason}`);
  }
}

export class SectionTypeInvalidException extends ValidationException {
  readonly code: string = 'SECTION_TYPE_INVALID';
  constructor(reason: string) {
    super(`Section type is invalid: ${reason}`);
  }
}

export class SectionItemInvalidException extends ValidationException {
  readonly code: string = 'SECTION_ITEM_INVALID';
  constructor(reason: string) {
    super(`Section item is invalid: ${reason}`);
  }
}

export class PrimaryResumeRequiredException extends ConflictException {
  readonly code: string = 'PRIMARY_RESUME_REQUIRED';
  constructor() {
    super('A primary resume is required for this operation');
  }
}

export class ResumeShareRevokedException extends DomainException {
  readonly code: string = 'RESUME_SHARE_REVOKED';
  readonly statusHint = 410;
  constructor() {
    super('This share link has been revoked');
  }
}

export class ResumeShareExpiredException extends DomainException {
  readonly code: string = 'RESUME_SHARE_EXPIRED';
  readonly statusHint = 410;
  constructor() {
    super('This share link has expired');
  }
}

export class ResumeSharePasswordRequiredException extends DomainException {
  readonly code: string = 'RESUME_SHARE_PASSWORD_REQUIRED';
  readonly statusHint = 401;
  constructor() {
    super('This share link requires a password');
  }
}

export class ResumeSharePasswordInvalidException extends DomainException {
  readonly code: string = 'RESUME_SHARE_PASSWORD_INVALID';
  readonly statusHint = 401;
  constructor() {
    super('Invalid password for this share link');
  }
}

export class ResumeShareSlugTakenException extends ConflictException {
  readonly code: string = 'RESUME_SHARE_SLUG_TAKEN';
  constructor(slug: string) {
    super(`Slug "${slug}" is already taken`);
  }
}

export class ResumeVersionNotFoundException extends DomainException {
  readonly code: string = 'RESUME_VERSION_NOT_FOUND';
  readonly statusHint = 404;
  constructor(versionId: string) {
    super(`Resume version ${versionId} not found`);
  }
}

export class TailorEngineUnavailableException extends DomainException {
  readonly code: string = 'RESUME_TAILOR_UNAVAILABLE';
  readonly statusHint = 503;
  constructor() {
    super('Resume tailoring is temporarily unavailable');
  }
}

export class ExportEngineUnavailableException extends DomainException {
  readonly code: string = 'RESUME_EXPORT_UNAVAILABLE';
  readonly statusHint = 503;
  constructor(format: string) {
    super(`Resume export to ${format} is temporarily unavailable`);
  }
}
