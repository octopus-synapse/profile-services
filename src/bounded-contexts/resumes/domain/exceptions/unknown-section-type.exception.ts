/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class UnknownSectionTypeException extends ValidationException {
  override readonly code: string = 'UNKNOWN_SECTION_TYPE';
  constructor(key: string) {
    super(`Unknown section type: ${key}`);
  }
}
