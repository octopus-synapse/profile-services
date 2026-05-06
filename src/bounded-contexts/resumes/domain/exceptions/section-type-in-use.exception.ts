/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class SectionTypeInUseException extends ValidationException {
  override readonly code: string = 'SECTION_TYPE_IN_USE';
  constructor(key: string, count: number) {
    super(
      `Cannot delete section type '${key}' - it is used by ${count} resume(s). Deactivate it instead.`,
    );
  }
}
