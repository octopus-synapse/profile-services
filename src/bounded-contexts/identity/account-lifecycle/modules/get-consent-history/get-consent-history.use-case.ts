/**
 * Get Consent History Use Case
 *
 * Retrieves all consent records for a user, ordered by most recent first.
 */

import type { ConsentRepositoryPort } from '../accept-consent/accept-consent.port';
import type { GetConsentHistoryInput, GetConsentHistoryOutput } from './get-consent-history.dto';

export class GetConsentHistoryUseCase {
  constructor(private readonly consentRepository: ConsentRepositoryPort) {}

  async execute(input: GetConsentHistoryInput): Promise<GetConsentHistoryOutput> {
    const records = await this.consentRepository.findAllByUser(input.userId);

    return records.map((record) => ({
      id: record.id,
      documentType: record.documentType,
      version: record.version,
      acceptedAt: record.acceptedAt,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
    }));
  }
}
