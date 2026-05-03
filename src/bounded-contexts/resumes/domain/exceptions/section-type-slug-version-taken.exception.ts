/**
 * Resumes Bounded Context Exceptions
 */
import { ConflictException } from '@/shared-kernel/exceptions';

export class SectionTypeSlugVersionTakenException extends ConflictException {
  readonly code: string = 'SECTION_TYPE_SLUG_VERSION_TAKEN';
  constructor(slug: string, version: number) {
    super(`Section type with slug '${slug}' and version ${version} already exists`);
  }
}
