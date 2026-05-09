/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class SectionTypeInvalidException extends ValidationException {
  override readonly code: string = 'SECTION_TYPE_INVALID';
  constructor(reason: string) {
    super(`Section type is invalid: ${reason}`);
  }
}
