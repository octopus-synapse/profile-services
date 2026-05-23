/**
 * Resumes Bounded Context Exceptions
 */
import { ConflictException } from '@/shared-kernel/exceptions';

export class SectionTypeAlreadyExistsException extends ConflictException {
  override readonly code: string = 'SECTION_TYPE_ALREADY_EXISTS';
  constructor(key: string) {
    super(`Section type '${key}' already exists`);
  }
}
