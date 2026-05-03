/**
 * Resumes Bounded Context Exceptions
 */
import { ForbiddenException } from '@/shared-kernel/exceptions';

export class ResumeAccessDeniedException extends ForbiddenException {
  readonly code: string = 'RESUME_ACCESS_DENIED';
  constructor() {
    super('Access denied to resume');
  }
}
