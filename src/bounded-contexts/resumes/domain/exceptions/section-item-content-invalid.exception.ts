/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class SectionItemContentInvalidException extends ValidationException {
  readonly code: string = 'SECTION_ITEM_CONTENT_INVALID';
  constructor(sectionTypeKey: string) {
    super(`Invalid content for section type ${sectionTypeKey}`);
  }
}
