/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class ResumeSectionInvalidException extends ValidationException {
  readonly code: string = 'RESUME_SECTION_INVALID';
  constructor(reason: string) {
    super(`Resume section is invalid: ${reason}`);
  }
}
