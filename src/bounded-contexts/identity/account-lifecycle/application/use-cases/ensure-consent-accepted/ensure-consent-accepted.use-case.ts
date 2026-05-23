/**
 * Ensure Consent Accepted Use Case
 *
 * Domain-level helper: verifies the caller has accepted the current
 * versions of both Terms of Service and the Privacy Policy. Throws
 * `ConsentRequiredException` (mapped to 403 with `consent_required`)
 * otherwise.
 *
 * The HTTP pipeline already gates routes globally via its inline
 * consent stage; this use case exists for in-process call sites
 * (background workers, internal queues) that need the same precondition
 * without going through HTTP — and as the canonical place a future
 * `ConsentGuard` adapter can delegate to.
 */

import type { LoggerPort } from '@/shared-kernel';
import { ConsentRequiredException } from '../../../domain/exceptions';
import { ConsentRepositoryPort } from '../accept-consent/accept-consent.port';
import { VersionConfigPort } from '../accept-consent/accept-consent.use-case';

export interface EnsureConsentAcceptedInput {
  readonly userId: string;
}

export class EnsureConsentAcceptedUseCase {
  constructor(
    private readonly consentRepository: ConsentRepositoryPort,
    private readonly versionConfig: VersionConfigPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: EnsureConsentAcceptedInput): Promise<void> {
    const tosVersion = this.versionConfig.getTosVersion();
    const privacyVersion = this.versionConfig.getPrivacyPolicyVersion();

    const [tos, privacy] = await Promise.all([
      this.consentRepository.findByUserAndDocumentType(
        input.userId,
        'TERMS_OF_SERVICE',
        tosVersion,
      ),
      this.consentRepository.findByUserAndDocumentType(
        input.userId,
        'PRIVACY_POLICY',
        privacyVersion,
      ),
    ]);

    if (!tos || !privacy) {
      this.logger.warn('Consent missing for user', 'EnsureConsentAcceptedUseCase', {
        userId: input.userId,
        tos: !!tos,
        privacy: !!privacy,
      });
      throw new ConsentRequiredException();
    }
  }
}
