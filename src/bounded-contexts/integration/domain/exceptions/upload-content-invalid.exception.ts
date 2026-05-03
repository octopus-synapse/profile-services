/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class UploadContentInvalidException extends ValidationException {
  readonly code: string = 'UPLOAD_CONTENT_INVALID';
  constructor(reason: 'too_small' | 'bad_magic_jpeg' | 'bad_magic_png' | 'bad_magic_webp') {
    super(
      reason === 'too_small'
        ? 'Invalid file content'
        : reason === 'bad_magic_jpeg'
          ? 'Invalid JPEG file content'
          : reason === 'bad_magic_png'
            ? 'Invalid PNG file content'
            : 'Invalid WEBP file content',
    );
  }
}
