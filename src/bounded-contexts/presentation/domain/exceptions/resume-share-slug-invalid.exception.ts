/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class ResumeShareSlugInvalidException extends ValidationException {
  readonly code: string = 'RESUME_SHARE_SLUG_INVALID';
  constructor() {
    super('Invalid slug format. Use alphanumeric characters and hyphens only.');
  }
}
