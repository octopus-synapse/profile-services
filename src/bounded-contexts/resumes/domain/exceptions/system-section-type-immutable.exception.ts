/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class SystemSectionTypeImmutableException extends ValidationException {
  readonly code: string = 'SYSTEM_SECTION_TYPE_IMMUTABLE';
  constructor() {
    super('Cannot modify key, semanticKind, or definition of system section types');
  }
}
