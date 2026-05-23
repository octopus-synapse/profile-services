/**
 * Resumes Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class ResumeTailorInputRequiredException extends ValidationException {
  override readonly code: string = 'RESUME_TAILOR_INPUT_REQUIRED';
  constructor() {
    super('Tailor input is required (job id or pasted description)');
  }
}
