/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class UploadFileTooLargeException extends ValidationException {
  readonly code: string = 'UPLOAD_FILE_TOO_LARGE';
  constructor(maxBytes: number) {
    super(`File size exceeds maximum allowed size of ${maxBytes} bytes`);
  }
}
