/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import {
  DomainException,
  ForbiddenException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class UnknownScreenException extends DomainException {
  readonly code: string = 'UNKNOWN_SCREEN';
  readonly statusHint = 404;
  constructor(screenId: string) {
    super(`Screen "${screenId}" is not registered`);
  }
}

export class UnknownEventException extends ValidationException {
  override readonly code: string = 'UNKNOWN_EVENT';
  constructor(eventName: string) {
    super(`Event "${eventName}" is not registered`);
  }
}

export class ScreenRenderFailedException extends DomainException {
  readonly code: string = 'SCREEN_RENDER_FAILED';
  readonly statusHint = 500;
  constructor(screenId: string, reason: string) {
    super(`Failed to render screen "${screenId}": ${reason}`);
  }
}

export class AnalyticsForbiddenException extends ForbiddenException {
  override readonly code: string = 'ANALYTICS_CONSENT_REQUIRED';
  constructor() {
    super('Analytics tracking requires explicit user consent');
  }
}

export class ResumeShareSlugInvalidException extends ValidationException {
  override readonly code: string = 'RESUME_SHARE_SLUG_INVALID';
  constructor() {
    super('Invalid slug format. Use alphanumeric characters and hyphens only.');
  }
}

export class ResumeShareSlugTakenException extends DomainException {
  readonly code: string = 'RESUME_SHARE_SLUG_TAKEN';
  readonly statusHint = 409;
  constructor() {
    super('Slug already in use');
  }
}

export class ResumeShareAccessDeniedException extends ForbiddenException {
  override readonly code: string = 'RESUME_SHARE_ACCESS_DENIED';
  constructor() {
    super('You do not have access to this share');
  }
}

export class ResumeShareAliasAccessDeniedException extends ForbiddenException {
  override readonly code: string = 'RESUME_SHARE_ALIAS_ACCESS_DENIED';
  constructor() {
    super('You do not have access to this alias');
  }
}

export class ResumeAccessDeniedException extends ForbiddenException {
  override readonly code: string = 'RESUME_ACCESS_DENIED';
  constructor() {
    super('You do not have access to this resume');
  }
}

export class ShareAliasNotFoundException extends DomainException {
  readonly code: string = 'SHARE_ALIAS_NOT_FOUND';
  readonly statusHint = 404;
  constructor() {
    super('Alias not found');
  }
}

export class ShareNotFoundException extends DomainException {
  readonly code: string = 'SHARE_NOT_FOUND';
  readonly statusHint = 404;
  constructor() {
    super('Share not found');
  }
}

export class ShareExpiredException extends DomainException {
  readonly code: string = 'RESUME_SHARE_EXPIRED';
  readonly statusHint = 404;
  constructor() {
    super('Share link expired');
  }
}

export class SharePasswordRequiredException extends ForbiddenException {
  override readonly code: string = 'SHARE_PASSWORD_REQUIRED';
  constructor() {
    super('Password required');
  }
}

export class SharePasswordInvalidException extends ForbiddenException {
  override readonly code: string = 'SHARE_PASSWORD_INVALID';
  constructor() {
    super('Invalid password');
  }
}

export class OnlyAdminsCanDoThisException extends ForbiddenException {
  override readonly code: string = 'ONLY_ADMINS_CAN_DO_THIS';
  constructor() {
    super('Only admins can perform this action');
  }
}

export class ResumeNotFoundException extends DomainException {
  readonly code: string = 'RESUME_NOT_FOUND';
  readonly statusHint = 404;
  constructor() {
    super('Resume not found');
  }
}

export class SectionNotFoundInResumeException extends DomainException {
  readonly code: string = 'SECTION_NOT_FOUND_IN_RESUME';
  readonly statusHint = 404;
  constructor(public readonly sectionTypeKey: string) {
    super(`Section ${sectionTypeKey} not found`);
  }
}

/**
 * Public-resume share access surface — used by the routes under
 * `presentation/public-resumes/*`.
 */
export class PublicResumeNotFoundException extends DomainException {
  readonly code: string = 'PUBLIC_RESUME_NOT_FOUND';
  readonly statusHint = 404;
  constructor(public readonly slug: string) {
    super(`Public resume "${slug}" not found`);
  }
}

export class ShareLinkExpiredException extends DomainException {
  readonly code: string = 'SHARE_LINK_EXPIRED';
  readonly statusHint = 410;
  constructor(public readonly slug: string) {
    super(`Share link "${slug}" has expired`);
  }
}

/**
 * QR / share-image generators require a target URL — empty input is a
 * validation error.
 */
export class QrUrlRequiredException extends ValidationException {
  override readonly code: string = 'QR_URL_REQUIRED';
  constructor() {
    super('A non-empty URL is required to generate the QR code');
  }
}

export class UrlRequiredException extends ValidationException {
  override readonly code: string = 'URL_REQUIRED';
  constructor() {
    super('A non-empty URL is required');
  }
}
