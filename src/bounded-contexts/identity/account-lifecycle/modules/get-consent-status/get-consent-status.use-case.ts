/**
 * Get Consent Status Use Case
 *
 * Returns which documents the user has accepted for the current versions.
 */

import type { ConsentRepositoryPort } from '../accept-consent/accept-consent.port';
import type { VersionConfigPort } from '../accept-consent/accept-consent.use-case';
import type { GetConsentStatusInput, GetConsentStatusOutput } from './get-consent-status.dto';

export class GetConsentStatusUseCase {
  constructor(
    private readonly consentRepository: ConsentRepositoryPort,
    private readonly versionConfig: VersionConfigPort,
  ) {}

  async execute(input: GetConsentStatusInput): Promise<GetConsentStatusOutput> {
    const tosVersion = this.versionConfig.getTosVersion();
    const privacyPolicyVersion = this.versionConfig.getPrivacyPolicyVersion();
    const marketingVersion = this.versionConfig.getMarketingConsentVersion();

    const [tosRecord, privacyRecord, marketingRecord] = await Promise.all([
      this.consentRepository.findByUserAndDocumentType(
        input.userId,
        'TERMS_OF_SERVICE',
        tosVersion,
      ),
      this.consentRepository.findByUserAndDocumentType(
        input.userId,
        'PRIVACY_POLICY',
        privacyPolicyVersion,
      ),
      this.consentRepository.findByUserAndDocumentType(
        input.userId,
        'MARKETING_CONSENT',
        marketingVersion,
      ),
    ]);

    return {
      tosAccepted: tosRecord !== null,
      privacyPolicyAccepted: privacyRecord !== null,
      marketingConsentAccepted: marketingRecord !== null,
      latestTosVersion: tosVersion,
      latestPrivacyPolicyVersion: privacyPolicyVersion,
    };
  }
}
