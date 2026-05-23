/**
 * Resumes Bounded Context Exceptions
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ExportEngineUnavailableException extends DomainException {
  readonly code: string = 'RESUME_EXPORT_UNAVAILABLE';
  readonly statusHint = 503;
  constructor(format: string) {
    super(`Resume export to ${format} is temporarily unavailable`);
  }
}
