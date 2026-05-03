/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class DuplicatedSectionFieldKeyException extends ValidationException {
  readonly code: string = 'DUPLICATED_SECTION_FIELD_KEY';
  constructor(key: string) {
    super(`Duplicated section field key: ${key}`);
  }
}
