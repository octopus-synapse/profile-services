import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { TosAcceptanceService } from './tos-acceptance.service';
import { UserConsentRepository } from '../repositories/user-consent.repository';
import { ConfigService } from '@nestjs/config';

describe('TosAcceptanceService', () => {
  let service: TosAcceptanceService;
  let userConsentRepository: {
    findByDocumentType: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    findAllByUserId: ReturnType<typeof mock>;
  };
  let config: any;

  beforeEach(async () => {
    userConsentRepository = {
      findByDocumentType: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      findAllByUserId: mock(() => Promise.resolve([])),
    };

    config = {
      get: mock(() => '1.0.0'), // Default ToS version
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TosAcceptanceService,
        { provide: UserConsentRepository, useValue: userConsentRepository },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<TosAcceptanceService>(TosAcceptanceService);
  });

  describe('hasAcceptedCurrentVersion', () => {
    it('should return false when user has not accepted ToS', async () => {
      // Arrange
      userConsentRepository.findByDocumentType.mockResolvedValue(null);

      // Act
      const result = await service.hasAcceptedCurrentVersion('user-123');

      // Assert
      expect(result).toBe(false);
      expect(userConsentRepository.findByDocumentType).toHaveBeenCalledWith(
        'user-123',
        'TERMS_OF_SERVICE',
      );
    });

    it('should return true when user has accepted current ToS version', async () => {
      // Arrange
      const mockConsent = {
        id: 'consent-1',
        userId: 'user-123',
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0.0',
        acceptedAt: new Date(),
      };
      userConsentRepository.findByDocumentType.mockResolvedValue(mockConsent);

      // Act
      const result = await service.hasAcceptedCurrentVersion('user-123');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user accepted old ToS version', async () => {
      // Arrange
      config.get.mockReturnValue('2.0.0'); // Current version is now 2.0.0
      userConsentRepository.findByDocumentType.mockResolvedValue(null); // No acceptance of v2.0.0

      // Act
      const result = await service.hasAcceptedCurrentVersion('user-123');

      // Assert
      expect(result).toBe(false);
      expect(userConsentRepository.findByDocumentType).toHaveBeenCalledWith(
        'user-123',
        'TERMS_OF_SERVICE',
      );
    });

    it('should check privacy policy acceptance', async () => {
      // Arrange
      userConsentRepository.findByDocumentType.mockResolvedValue({
        documentType: 'PRIVACY_POLICY',
        version: '1.0.0',
      });

      // Act
      const result = await service.hasAcceptedCurrentVersion(
        'user-123',
        'PRIVACY_POLICY',
      );

      // Assert
      expect(result).toBe(true);
      expect(userConsentRepository.findByDocumentType).toHaveBeenCalledWith(
        'user-123',
        'PRIVACY_POLICY',
      );
    });
  });

  describe('recordAcceptance', () => {
    it('should create new consent record with audit trail', async () => {
      // Arrange
      const userId = 'user-123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      const mockCreatedConsent = {
        id: 'consent-1',
        userId,
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0.0',
        acceptedAt: new Date(),
        ipAddress,
        userAgent,
      };

      userConsentRepository.create.mockResolvedValue(mockCreatedConsent);

      // Act
      const result = await service.recordAcceptance(userId, {
        documentType: 'TERMS_OF_SERVICE',
        ipAddress,
        userAgent,
      });

      // Assert
      expect(result).toEqual(mockCreatedConsent);
      expect(userConsentRepository.create).toHaveBeenCalledWith({
        userId,
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0.0',
        ipAddress,
        userAgent,
      });
    });

    it('should record privacy policy acceptance', async () => {
      // Arrange
      const userId = 'user-456';
      const mockConsent = {
        id: 'consent-2',
        userId,
        documentType: 'PRIVACY_POLICY',
        version: '1.0.0',
        acceptedAt: new Date(),
      };

      userConsentRepository.create.mockResolvedValue(mockConsent);

      // Act
      await service.recordAcceptance(userId, {
        documentType: 'PRIVACY_POLICY',
      });

      // Assert
      expect(userConsentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          documentType: 'PRIVACY_POLICY',
          version: '1.0.0',
        }),
      );
    });

    it('should handle missing IP and user agent gracefully', async () => {
      // Arrange
      const userId = 'user-789';
      userConsentRepository.create.mockResolvedValue({
        id: 'consent-3',
        userId,
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0.0',
        acceptedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      });

      // Act
      await service.recordAcceptance(userId, {
        documentType: 'TERMS_OF_SERVICE',
      });

      // Assert
      expect(userConsentRepository.create).toHaveBeenCalledWith({
        userId,
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0.0',
        ipAddress: undefined,
        userAgent: undefined,
      });
    });
  });

  describe('getAcceptanceHistory', () => {
    it('should return all consent records for user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockHistory = [
        {
          id: 'consent-1',
          userId,
          documentType: 'TERMS_OF_SERVICE',
          version: '1.0.0',
          acceptedAt: new Date('2026-01-01'),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        {
          id: 'consent-2',
          userId,
          documentType: 'PRIVACY_POLICY',
          version: '1.0.0',
          acceptedAt: new Date('2026-01-01'),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      ];

      userConsentRepository.findAllByUserId.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getAcceptanceHistory(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockHistory);
      expect(userConsentRepository.findAllByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should return empty array when user has no consents', async () => {
      // Arrange
      userConsentRepository.findAllByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getAcceptanceHistory('user-new');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
