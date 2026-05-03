/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { ForbiddenException } from '@/shared-kernel/exceptions';

export class ResumeShareAccessDeniedException extends ForbiddenException {
  readonly code: string = 'RESUME_SHARE_ACCESS_DENIED';
  constructor() {
    super('You do not have access to this share');
  }
}
