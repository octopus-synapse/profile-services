/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class UploadStorageUnavailableException extends DomainException {
  readonly code: string = 'UPLOAD_STORAGE_UNAVAILABLE';
  readonly statusHint = 503;
  constructor() {
    super('File storage backend is temporarily unavailable');
  }
}
