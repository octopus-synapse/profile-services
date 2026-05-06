/**
 * Resumes Bounded Context Exceptions
 */
import { ForbiddenException } from '@/shared-kernel/exceptions';

export class ResumeNotOwnedException extends ForbiddenException {
  override readonly code: string = 'RESUME_NOT_OWNED';
  constructor() {
    super('You can only modify your own resume');
  }
}
