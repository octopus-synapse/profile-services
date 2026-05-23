/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class SectionItemLimitExceededException extends ValidationException {
  override readonly code: string = 'SECTION_ITEM_LIMIT_EXCEEDED';
  constructor(maxItems: number) {
    super(`Section reached maximum item limit (${maxItems})`);
  }
}
