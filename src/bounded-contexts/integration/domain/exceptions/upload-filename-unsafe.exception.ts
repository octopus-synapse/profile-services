/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class UploadFilenameUnsafeException extends ValidationException {
  readonly code: string = 'UPLOAD_FILENAME_UNSAFE';
  constructor(reason: 'null_bytes' | 'directory_traversal') {
    super(
      reason === 'null_bytes'
        ? 'Invalid filename: contains null bytes'
        : 'Invalid filename: directory traversal detected',
    );
  }
}
