import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { TosAcceptanceService } from './tos-acceptance.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('TosAcceptanceService', () => {
  let service: TosAcceptanceService;
  let prisma: any;
  let config: any;

  beforeEach(async () => {
    prisma = {
      userConsent: {
        findFirst: mock(),
        create: mock(),
        findMany: mock(),
      },
    };

    config = {
      get: mock(() => '1.0.0'), // Default ToS version
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TosAcceptanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<TosAcceptanceService>(TosAcceptanceService);
  });

  describe('hasAcceptedCurrentVersion', () => {
    it('should return false when user has not accepted ToS', async () => {
      // Arrange
      prisma.userConsent.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.hasAcceptedCurrentVersion('user-123');

      // Assert
      expect(result).toBe(false);
      expect(prisma.userConsent.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          documentType: 'TERMS_OF_SERVICE',
          version: '1.0.0',
        },
      });
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
      prisma.userConsent.findFirst.mockResolvedValue(mockConsent);

      // Act
      const result = await service.hasAcceptedCurrentVersion('user-123');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user accepted old ToS version', async () => {
      // Arrange
      config.get.mockReturnValue('2.0.0'); // Current version is now 2.0.0
      prisma.userConsent.findFirst.mockResolvedValue(null); // No acceptance of v2.0.0

      // Act
      const result = await service.hasAcceptedCurrentVersion('user-123');

      // Assert
      expect(result).toBe(false);
      expect(prisma.userConsent.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          documentType: 'TERMS_OF_SERVICE',
          version: '2.0.0',
        },
      });
    });

    it('should check privacy policy acceptance', async () => {
      // Arrange
      prisma.userConsent.findFirst.mockResolvedValue({
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
      expect(prisma.userConsent.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          documentType: 'PRIVACY_POLICY',
          version: '1.0.0',
        },
      });
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

      prisma.userConsent.create.mockResolvedValue(mockCreatedConsent);

      // Act
      const result = await service.recordAcceptance(userId, {
        documentType: 'TERMS_OF_SERVICE',
        ipAddress,
        userAgent,
      });

      // Assert
      expect(result).toEqual(mockCreatedConsent);
      expect(prisma.userConsent.create).toHaveBeenCalledWith({
        data: {
          userId,
          documentType: 'TERMS_OF_SERVICE',
          version: '1.0.0',
          ipAddress,
          userAgent,
        },
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

      prisma.userConsent.create.mockResolvedValue(mockConsent);

      // Act
      await service.recordAcceptance(userId, {
        documentType: 'PRIVACY_POLICY',
      });

      // Assert
      expect(prisma.userConsent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          documentType: 'PRIVACY_POLICY',
          version: '1.0.0',
        }),
      });
    });

    it('should handle missing IP and user agent gracefully', async () => {
      // Arrange
      const userId = 'user-789';
      prisma.userConsent.create.mockResolvedValue({
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
      expect(prisma.userConsent.create).toHaveBeenCalledWith({
        data: {
          userId,
          documentType: 'TERMS_OF_SERVICE',
          version: '1.0.0',
          ipAddress: undefined,
          userAgent: undefined,
        },
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

      prisma.userConsent.findMany.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getAcceptanceHistory(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockHistory);
      expect(prisma.userConsent.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { acceptedAt: 'desc' },
      });
    });

    it('should return empty array when user has no consents', async () => {
      // Arrange
      prisma.userConsent.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getAcceptanceHistory('user-new');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
