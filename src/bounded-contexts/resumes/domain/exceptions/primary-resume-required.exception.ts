/**
 * Resumes Bounded Context Exceptions
 */
import { ConflictException } from '@/shared-kernel/exceptions';

export class PrimaryResumeRequiredException extends ConflictException {
  readonly code: string = 'PRIMARY_RESUME_REQUIRED';
  constructor() {
    super('A primary resume is required for this operation');
  }
}
