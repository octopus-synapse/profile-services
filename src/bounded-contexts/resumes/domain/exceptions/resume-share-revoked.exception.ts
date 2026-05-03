/**
 * Resumes Bounded Context Exceptions
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ResumeShareRevokedException extends DomainException {
  readonly code: string = 'RESUME_SHARE_REVOKED';
  readonly statusHint = 410;
  constructor() {
    super('This share link has been revoked');
  }
}
