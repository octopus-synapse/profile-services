/**
 * In-Memory Consent Repository
 *
 * Fake implementation for testing consent operations.
 * Stores data in memory using Map for O(1) lookups.
 */

import type { ConsentDocumentType } from '@prisma/client';
import type {
  ConsentRecord,
  ConsentRepositoryPort,
  CreateConsentData,
} from '../../../account-lifecycle/domain/ports/consent-repository.port';

export class InMemoryConsentRepository implements ConsentRepositoryPort {
  private consents: Map<string, ConsentRecord> = new Map();
  private idCounter = 0;

  async create(data: CreateConsentData): Promise<ConsentRecord> {
    const id = `consent-${++this.idCounter}`;
    const consent: ConsentRecord = {
      id,
      userId: data.userId,
      documentType: data.documentType,
      version: data.version,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      acceptedAt: new Date(),
    };
    this.consents.set(id, consent);
    return consent;
  }

  async findByUserAndDocumentType(
    userId: string,
    documentType: ConsentDocumentType,
    version: string,
  ): Promise<ConsentRecord | null> {
    for (const consent of this.consents.values()) {
      if (
        consent.userId === userId &&
        consent.documentType === documentType &&
        consent.version === version
      ) {
        return consent;
      }
    }
    return null;
  }

  async findAllByUser(userId: string): Promise<ConsentRecord[]> {
    const userConsents: ConsentRecord[] = [];
    for (const consent of this.consents.values()) {
      if (consent.userId === userId) {
        userConsents.push(consent);
      }
    }
    // Order by acceptedAt descending
    return userConsents.sort((a, b) => b.acceptedAt.getTime() - a.acceptedAt.getTime());
  }

  // Test helpers
  seed(records: ConsentRecord[]): void {
    this.consents.clear();
    for (const record of records) {
      this.consents.set(record.id, record);
    }
  }

  clear(): void {
    this.consents.clear();
    this.idCounter = 0;
  }

  getAll(): ConsentRecord[] {
    return Array.from(this.consents.values());
  }
}
