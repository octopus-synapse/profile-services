/**
 * Resumes Bounded Context Exceptions
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ResumeSharePasswordInvalidException extends DomainException {
  readonly code: string = 'RESUME_SHARE_PASSWORD_INVALID';
  readonly statusHint = 401;
  constructor() {
    super('Invalid password for this share link');
  }
}
