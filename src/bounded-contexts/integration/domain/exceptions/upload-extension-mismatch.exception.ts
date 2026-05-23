/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class UploadExtensionMismatchException extends ValidationException {
  override readonly code: string = 'UPLOAD_EXTENSION_MISMATCH';
  constructor(ext: string, mime: string) {
    super(`File extension .${ext} does not match file type ${mime}`);
  }
}
