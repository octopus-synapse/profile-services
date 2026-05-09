/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ResumeShareSlugTakenException extends DomainException {
  readonly code: string = 'RESUME_SHARE_SLUG_TAKEN';
  readonly statusHint = 409;
  constructor() {
    super('Slug already in use');
  }
}
