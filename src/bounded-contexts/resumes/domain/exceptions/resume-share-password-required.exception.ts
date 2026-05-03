/**
 * Resumes Bounded Context Exceptions
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ResumeSharePasswordRequiredException extends DomainException {
  readonly code: string = 'RESUME_SHARE_PASSWORD_REQUIRED';
  readonly statusHint = 401;
  constructor() {
    super('This share link requires a password');
  }
}
