/**
 * Get Consent History Use Case
 *
 * Retrieves all consent records for a user, ordered by most recent first.
 */

import { ConsentRepositoryPort } from '../accept-consent/accept-consent.port';
import type { GetConsentHistoryInput, GetConsentHistoryOutput } from './get-consent-history.schema';

export class GetConsentHistoryUseCase {
  constructor(private readonly consentRepository: ConsentRepositoryPort) {}

  async execute(input: GetConsentHistoryInput): Promise<GetConsentHistoryOutput> {
    const records = await this.consentRepository.listByUser(input.userId);

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
