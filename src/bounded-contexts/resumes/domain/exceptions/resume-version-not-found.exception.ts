/**
 * Resumes Bounded Context Exceptions
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ResumeVersionNotFoundException extends DomainException {
  readonly code: string = 'RESUME_VERSION_NOT_FOUND';
  readonly statusHint = 404;
  constructor(versionId: string) {
    super(`Resume version ${versionId} not found`);
  }
}
