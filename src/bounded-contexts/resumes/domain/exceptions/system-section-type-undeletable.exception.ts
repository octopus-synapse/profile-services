/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class SystemSectionTypeUndeletableException extends ValidationException {
  override readonly code: string = 'SYSTEM_SECTION_TYPE_UNDELETABLE';
  constructor() {
    super('Cannot delete system section types');
  }
}
