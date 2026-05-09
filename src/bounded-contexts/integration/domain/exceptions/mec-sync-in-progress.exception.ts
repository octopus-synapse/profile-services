/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class MecSyncInProgressException extends DomainException {
  readonly code: string = 'MEC_SYNC_IN_PROGRESS';
  readonly statusHint = 409;
  constructor() {
    super('Sync already in progress. Please wait for the current sync to complete.');
  }
}
