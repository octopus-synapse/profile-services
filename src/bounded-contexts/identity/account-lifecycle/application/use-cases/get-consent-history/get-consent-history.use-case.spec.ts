/**
 * Get Consent History Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { ConsentDocumentType } from '@prisma/client';
import { InMemoryConsentRepository } from '../../../../shared-kernel/testing';
import { GetConsentHistoryUseCase } from './get-consent-history.use-case';

describe('GetConsentHistoryUseCase', () => {
  let useCase: GetConsentHistoryUseCase;
  let consentRepository: InMemoryConsentRepository;

  beforeEach(() => {
    consentRepository = new InMemoryConsentRepository();
    useCase = new GetConsentHistoryUseCase(consentRepository);
  });

  describe('execute', () => {
    it('should return empty array when user has no consent records', async () => {
      const result = await useCase.execute({ userId: 'user-123' });

      expect(result).toEqual([]);
    });

    it('should return all consent records for user ordered by most recent first', async () => {
      consentRepository.seed([
        {
          id: 'consent-1',
          userId: 'user-123',
          documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
          version: '1.0.0',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          acceptedAt: new Date('2024-01-15'),
        },
        {
          id: 'consent-2',
          userId: 'user-123',
          documentType: 'PRIVACY_POLICY' as ConsentDocumentType,
          version: '2.0.0',
          ipAddress: null,
          userAgent: null,
          acceptedAt: new Date('2024-01-16'),
        },
      ]);

      const result = await useCase.execute({ userId: 'user-123' });

      expect(result).toHaveLength(2);
      // Most recent first (2024-01-16 > 2024-01-15)
      expect(result[0].id).toBe('consent-2');
      expect(result[0].documentType).toBe('PRIVACY_POLICY');
      expect(result[1].id).toBe('consent-1');
      expect(result[1].documentType).toBe('TERMS_OF_SERVICE');
    });

    it('should map all fields correctly', async () => {
      const acceptedAt = new Date('2024-01-15T10:30:00Z');
      consentRepository.seed([
        {
          id: 'consent-1',
          userId: 'user-123',
          documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
          version: '1.0.0',
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome/120',
          acceptedAt,
        },
      ]);

      const result = await useCase.execute({ userId: 'user-123' });

      expect(result[0]).toEqual({
        id: 'consent-1',
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0.0',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/120',
        acceptedAt,
      });
    });

    it('should not return consents from other users', async () => {
      consentRepository.seed([
        {
          id: 'consent-1',
          userId: 'other-user',
          documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
          version: '1.0.0',
          ipAddress: null,
          userAgent: null,
          acceptedAt: new Date(),
        },
      ]);

      const result = await useCase.execute({ userId: 'user-123' });

      expect(result).toEqual([]);
    });
  });
});
