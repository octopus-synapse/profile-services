/**
 * Accept Consent Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { AuditAction, ConsentDocumentType } from '@prisma/client';
import {
  InMemoryAuditLogger,
  InMemoryConsentRepository,
  StubVersionConfig,
} from '../../../shared-kernel/testing';
import { AcceptConsentUseCase } from './accept-consent.use-case';

describe('AcceptConsentUseCase', () => {
  let useCase: AcceptConsentUseCase;
  let consentRepository: InMemoryConsentRepository;
  let auditLogger: InMemoryAuditLogger;
  let versionConfig: StubVersionConfig;

  beforeEach(() => {
    consentRepository = new InMemoryConsentRepository();
    auditLogger = new InMemoryAuditLogger();
    versionConfig = new StubVersionConfig('1.0.0', '2.0.0', '1.0.0');

    useCase = new AcceptConsentUseCase(consentRepository, versionConfig, auditLogger);
  });

  describe('execute', () => {
    it('should accept Terms of Service consent', async () => {
      const input = {
        userId: 'user-123',
        documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = await useCase.execute(input);

      // Verify result
      expect(result.id).toBeDefined();
      expect(result.documentType).toBe('TERMS_OF_SERVICE');
      expect(result.version).toBe('1.0.0');
      expect(result.userId).toBe('user-123');

      // Verify consent was persisted
      const storedConsents = consentRepository.getAll();
      expect(storedConsents).toHaveLength(1);
      expect(storedConsents[0].ipAddress).toBe('127.0.0.1');
      expect(storedConsents[0].userAgent).toBe('Mozilla/5.0');

      // Verify audit log
      expect(auditLogger.hasLoggedAction('user-123', AuditAction.TOS_ACCEPTED)).toBe(true);
      const auditEntry = auditLogger.getLastEntry();
      expect(auditEntry?.entityType).toBe('UserConsent');
      expect(auditEntry?.entityId).toBe(result.id);
    });

    it('should accept Privacy Policy consent with correct version', async () => {
      const input = {
        userId: 'user-123',
        documentType: 'PRIVACY_POLICY' as ConsentDocumentType,
      };

      const result = await useCase.execute(input);

      expect(result.documentType).toBe('PRIVACY_POLICY');
      expect(result.version).toBe('2.0.0'); // Privacy policy has version 2.0.0

      // Verify audit
      expect(auditLogger.hasLoggedAction('user-123', AuditAction.PRIVACY_POLICY_ACCEPTED)).toBe(
        true,
      );
    });

    it('should accept Marketing Consent', async () => {
      const input = {
        userId: 'user-123',
        documentType: 'MARKETING_CONSENT' as ConsentDocumentType,
      };

      const result = await useCase.execute(input);

      expect(result.documentType).toBe('MARKETING_CONSENT');
      expect(result.version).toBe('1.0.0');

      // Verify consent was stored
      const stored = await consentRepository.findAllByUser('user-123');
      expect(stored).toHaveLength(1);
    });

    it('should allow same user to accept multiple document types', async () => {
      await useCase.execute({
        userId: 'user-123',
        documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
      });

      await useCase.execute({
        userId: 'user-123',
        documentType: 'PRIVACY_POLICY' as ConsentDocumentType,
      });

      const allConsents = await consentRepository.findAllByUser('user-123');
      expect(allConsents).toHaveLength(2);

      const auditEntries = auditLogger.getEntriesForUser('user-123');
      expect(auditEntries).toHaveLength(2);
    });

    it('should handle consent without optional fields', async () => {
      const input = {
        userId: 'user-456',
        documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
        // No ipAddress, no userAgent
      };

      const result = await useCase.execute(input);

      expect(result.id).toBeDefined();

      const stored = consentRepository.getAll()[0];
      expect(stored.ipAddress).toBeNull();
      expect(stored.userAgent).toBeNull();
    });
  });
});
