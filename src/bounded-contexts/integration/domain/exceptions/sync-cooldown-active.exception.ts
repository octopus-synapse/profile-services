/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class SyncCooldownActiveException extends ValidationException {
  override readonly code: string = 'SYNC_COOLDOWN_ACTIVE';
  constructor(retryAfterMinutes: number) {
    super(`Sync cooldown is active. Try again in ${retryAfterMinutes} minutes`);
  }
}
