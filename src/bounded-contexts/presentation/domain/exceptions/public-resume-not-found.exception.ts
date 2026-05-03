/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { DomainException } from '@/shared-kernel/exceptions';

/**
 * Public-resume share access surface — used by the routes under
 * `presentation/public-resumes/*`.
 */
export class PublicResumeNotFoundException extends DomainException {
  readonly code: string = 'PUBLIC_RESUME_NOT_FOUND';
  readonly statusHint = 404;
  constructor(public readonly slug: string) {
    super(`Public resume "${slug}" not found`);
  }
}
