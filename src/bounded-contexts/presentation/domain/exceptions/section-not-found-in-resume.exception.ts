/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class SectionNotFoundInResumeException extends DomainException {
  readonly code: string = 'SECTION_NOT_FOUND_IN_RESUME';
  readonly statusHint = 404;
  constructor(public readonly sectionTypeKey: string) {
    super(`Section ${sectionTypeKey} not found`);
  }
}
