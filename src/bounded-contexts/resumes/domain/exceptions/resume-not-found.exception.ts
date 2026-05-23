/**
 * Resumes Bounded Context Exceptions
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ResumeNotFoundException extends DomainException {
  readonly code: string = 'RESUME_NOT_FOUND';
  readonly statusHint = 404;
  constructor() {
    super('Resume not found');
  }
}
