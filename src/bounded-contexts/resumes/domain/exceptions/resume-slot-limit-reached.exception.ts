/**
 * Resumes Bounded Context Exceptions
 */
import { ConflictException } from '@/shared-kernel/exceptions';

export class ResumeSlotLimitReachedException extends ConflictException {
  readonly code: string = 'RESUME_SLOT_LIMIT_REACHED';
  constructor(max: number) {
    super(`Resume slot limit reached (${max})`);
  }
}
