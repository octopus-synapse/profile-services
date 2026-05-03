/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class SectionItemInvalidException extends ValidationException {
  readonly code: string = 'SECTION_ITEM_INVALID';
  constructor(reason: string) {
    super(`Section item is invalid: ${reason}`);
  }
}
