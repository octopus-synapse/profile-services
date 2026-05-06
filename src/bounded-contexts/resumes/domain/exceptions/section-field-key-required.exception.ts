/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class SectionFieldKeyRequiredException extends ValidationException {
  override readonly code: string = 'SECTION_FIELD_KEY_REQUIRED';
  constructor(location: 'top-level' | 'nested' = 'top-level') {
    super(
      location === 'nested'
        ? 'Nested object fields must define a key'
        : 'Top-level section fields must define a key',
    );
  }
}
