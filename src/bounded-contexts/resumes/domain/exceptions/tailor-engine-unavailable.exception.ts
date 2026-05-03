/**
 * Resumes Bounded Context Exceptions
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class TailorEngineUnavailableException extends DomainException {
  readonly code: string = 'RESUME_TAILOR_UNAVAILABLE';
  readonly statusHint = 503;
  constructor() {
    super('Resume tailoring is temporarily unavailable');
  }
}
