/**
 * Get Consent Status Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { ConsentDocumentType } from '@prisma/client';
import { InMemoryConsentRepository, StubVersionConfig } from '../../../shared-kernel/testing';
import { GetConsentStatusUseCase } from './get-consent-status.use-case';

describe('GetConsentStatusUseCase', () => {
  let useCase: GetConsentStatusUseCase;
  let consentRepository: InMemoryConsentRepository;
  let versionConfig: StubVersionConfig;

  beforeEach(() => {
    consentRepository = new InMemoryConsentRepository();
    versionConfig = new StubVersionConfig('1.0.0', '2.0.0', '1.0.0');

    useCase = new GetConsentStatusUseCase(consentRepository, versionConfig);
  });

  describe('execute', () => {
    it('should return all consents as false when user has accepted nothing', async () => {
      const result = await useCase.execute({ userId: 'user-123' });

      expect(result.tosAccepted).toBe(false);
      expect(result.privacyPolicyAccepted).toBe(false);
      expect(result.marketingConsentAccepted).toBe(false);
      expect(result.latestTosVersion).toBe('1.0.0');
      expect(result.latestPrivacyPolicyVersion).toBe('2.0.0');
    });

    it('should return true for accepted consents', async () => {
      // Seed ToS consent
      consentRepository.seed([
        {
          id: 'consent-1',
          userId: 'user-123',
          documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
          version: '1.0.0',
          ipAddress: null,
          userAgent: null,
          acceptedAt: new Date(),
        },
      ]);

      const result = await useCase.execute({ userId: 'user-123' });

      expect(result.tosAccepted).toBe(true);
      expect(result.privacyPolicyAccepted).toBe(false);
      expect(result.marketingConsentAccepted).toBe(false);
    });

    it('should return false if consent version does not match current', async () => {
      // Seed ToS with old version
      consentRepository.seed([
        {
          id: 'consent-1',
          userId: 'user-123',
          documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
          version: '0.9.0', // Old version, current is 1.0.0
          ipAddress: null,
          userAgent: null,
          acceptedAt: new Date(),
        },
      ]);

      const result = await useCase.execute({ userId: 'user-123' });

      expect(result.tosAccepted).toBe(false); // Version mismatch
    });

    it('should return true for all accepted consents', async () => {
      // Seed all consents
      consentRepository.seed([
        {
          id: 'consent-1',
          userId: 'user-123',
          documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
          version: '1.0.0',
          ipAddress: null,
          userAgent: null,
          acceptedAt: new Date(),
        },
        {
          id: 'consent-2',
          userId: 'user-123',
          documentType: 'PRIVACY_POLICY' as ConsentDocumentType,
          version: '2.0.0',
          ipAddress: null,
          userAgent: null,
          acceptedAt: new Date(),
        },
        {
          id: 'consent-3',
          userId: 'user-123',
          documentType: 'MARKETING_CONSENT' as ConsentDocumentType,
          version: '1.0.0',
          ipAddress: null,
          userAgent: null,
          acceptedAt: new Date(),
        },
      ]);

      const result = await useCase.execute({ userId: 'user-123' });

      expect(result.tosAccepted).toBe(true);
      expect(result.privacyPolicyAccepted).toBe(true);
      expect(result.marketingConsentAccepted).toBe(true);
    });

    it('should not return consents from other users', async () => {
      // Seed consent for different user
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

      expect(result.tosAccepted).toBe(false);
    });
  });
});
