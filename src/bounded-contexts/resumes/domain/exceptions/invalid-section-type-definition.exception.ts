/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class InvalidSectionTypeDefinitionException extends ValidationException {
  readonly code: string = 'INVALID_SECTION_TYPE_DEFINITION';
  constructor() {
    super('Invalid section type definition');
  }
}
