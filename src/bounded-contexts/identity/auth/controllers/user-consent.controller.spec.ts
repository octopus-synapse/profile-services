import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { UserConsentController } from './user-consent.controller';
import { TosAcceptanceService } from '../services/tos-acceptance.service';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';

describe('UserConsentController', () => {
  let controller: UserConsentController;
  let tosService: any;
  let auditService: any;

  beforeEach(async () => {
    tosService = {
      hasAcceptedCurrentVersion: mock(),
      recordAcceptance: mock(),
      getAcceptanceHistory: mock(),
    };

    auditService = {
      log: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserConsentController],
      providers: [
        { provide: TosAcceptanceService, useValue: tosService },
        { provide: AuditLogService, useValue: auditService },
      ],
    }).compile();

    controller = module.get<UserConsentController>(UserConsentController);
  });

  describe('acceptConsent', () => {
    it('should accept ToS and record acceptance', async () => {
      // Arrange
      const userId = 'user-123';
      const req = {
        user: { userId: userId },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };
      const dto = { documentType: 'TERMS_OF_SERVICE' as const };

      const mockConsent = {
        id: 'consent-1',
        userId,
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0.0',
        acceptedAt: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      tosService.recordAcceptance.mockResolvedValue(mockConsent);

      // Act
      const result = await controller.acceptConsent(req, dto);

      // Assert
      expect(result).toEqual({
        message: 'Terms of Service accepted successfully',
        consent: mockConsent,
      });
      expect(tosService.recordAcceptance).toHaveBeenCalledWith(userId, {
        documentType: 'TERMS_OF_SERVICE',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should accept Privacy Policy', async () => {
      // Arrange
      const req = {
        user: { userId: 'user-456' },
        ip: '10.0.0.1',
        headers: { 'user-agent': 'Chrome/120.0' },
      };
      const dto = { documentType: 'PRIVACY_POLICY' as const };

      tosService.recordAcceptance.mockResolvedValue({
        id: 'consent-2',
        documentType: 'PRIVACY_POLICY',
      });

      // Act
      const result = await controller.acceptConsent(req, dto);

      // Assert
      expect(result.message).toBe('Privacy Policy accepted successfully');
      expect(tosService.recordAcceptance).toHaveBeenCalledWith('user-456', {
        documentType: 'PRIVACY_POLICY',
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/120.0',
      });
    });

    it('should use provided IP and user agent from DTO', async () => {
      // Arrange
      const req = {
        user: { userId: 'user-789' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Default-Agent' },
      };
      const dto = {
        documentType: 'TERMS_OF_SERVICE' as const,
        ipAddress: '203.0.113.1',
        userAgent: 'Custom-Agent/1.0',
      };

      tosService.recordAcceptance.mockResolvedValue({});

      // Act
      await controller.acceptConsent(req, dto);

      // Assert
      expect(tosService.recordAcceptance).toHaveBeenCalledWith('user-789', {
        documentType: 'TERMS_OF_SERVICE',
        ipAddress: '203.0.113.1', // From DTO, not request
        userAgent: 'Custom-Agent/1.0', // From DTO, not request
      });
    });

    it('should log acceptance in audit trail', async () => {
      // Arrange
      const req = {
        user: { userId: 'user-audit' },
        ip: '1.2.3.4',
        headers: { 'user-agent': 'Agent' },
      };
      const dto = { documentType: 'TERMS_OF_SERVICE' as const };

      tosService.recordAcceptance.mockResolvedValue({
        id: 'consent-audit',
      });

      // Act
      await controller.acceptConsent(req, dto);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        'user-audit',
        'TOS_ACCEPTED',
        'UserConsent',
        'consent-audit',
        undefined,
        req,
      );
    });

    it('should return appropriate message for Marketing Consent', async () => {
      // Arrange
      const req = {
        user: { userId: 'user-marketing' },
        ip: '0.0.0.0',
        headers: { 'user-agent': 'Agent' },
      };
      const dto = { documentType: 'MARKETING_CONSENT' as const };

      tosService.recordAcceptance.mockResolvedValue({});

      // Act
      const result = await controller.acceptConsent(req, dto);

      // Assert
      expect(result.message).toBe('Marketing Consent accepted successfully');
    });
  });

  describe('getConsentHistory', () => {
    it('should return consent history for authenticated user', async () => {
      // Arrange
      const userId = 'user-history';
      const req = { user: { userId: userId } };

      const mockHistory = [
        {
          id: 'c1',
          documentType: 'TERMS_OF_SERVICE',
          version: '1.0.0',
          acceptedAt: new Date('2026-01-01'),
        },
        {
          id: 'c2',
          documentType: 'PRIVACY_POLICY',
          version: '1.0.0',
          acceptedAt: new Date('2026-01-01'),
        },
      ];

      tosService.getAcceptanceHistory.mockResolvedValue(mockHistory);

      // Act
      const result = await controller.getConsentHistory(req);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(tosService.getAcceptanceHistory).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when no consents exist', async () => {
      // Arrange
      const req = { user: { userId: 'user-new' } };
      tosService.getAcceptanceHistory.mockResolvedValue([]);

      // Act
      const result = await controller.getConsentHistory(req);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('checkConsentStatus', () => {
    it('should return acceptance status for all document types', async () => {
      // Arrange
      const req = { user: { userId: 'user-check' } };

      tosService.hasAcceptedCurrentVersion
        .mockResolvedValueOnce(true) // ToS
        .mockResolvedValueOnce(false) // Privacy Policy
        .mockResolvedValueOnce(false); // Marketing Consent

      // Act
      const result = await controller.checkConsentStatus(req);

      // Assert
      expect(result).toEqual({
        tosAccepted: true,
        privacyPolicyAccepted: false,
        marketingConsentAccepted: false,
        latestTosVersion: '1.0.0',
        latestPrivacyPolicyVersion: '1.0.0',
      });
      expect(tosService.hasAcceptedCurrentVersion).toHaveBeenCalledTimes(3);
    });

    it('should check all three consent types', async () => {
      // Arrange
      const req = { user: { userId: 'user-all-accepted' } };

      tosService.hasAcceptedCurrentVersion
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      // Act
      const result = await controller.checkConsentStatus(req);

      // Assert
      expect(result.tosAccepted).toBe(true);
      expect(result.privacyPolicyAccepted).toBe(true);
      expect(result.marketingConsentAccepted).toBe(true);
    });
  });
});
