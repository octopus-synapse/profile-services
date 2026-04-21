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
  readonly code: string = 'UNKNOWN_EVENT';
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
  readonly code: string = 'ANALYTICS_CONSENT_REQUIRED';
  constructor() {
    super('Analytics tracking requires explicit user consent');
  }
}
