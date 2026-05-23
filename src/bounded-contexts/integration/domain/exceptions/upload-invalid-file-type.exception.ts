/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class UploadInvalidFileTypeException extends ValidationException {
  override readonly code: string = 'UPLOAD_INVALID_FILE_TYPE';
  constructor(allowed: string[]) {
    super(`Invalid file type. Allowed types: ${allowed.join(', ')}`);
  }
}
