import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { GdprExportService } from './gdpr-export.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { NotFoundException } from '@nestjs/common';

describe('GdprExportService', () => {
  let service: GdprExportService;
  let prisma: any;
  let auditLog: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: mock(),
      },
      userConsent: {
        findMany: mock(),
      },
      resume: {
        findMany: mock(),
      },
      auditLog: {
        findMany: mock(),
      },
    };

    auditLog = {
      log: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprExportService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<GdprExportService>(GdprExportService);
  });

  describe('exportUserData', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      role: 'USER',
      hasCompletedOnboarding: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    it('should export all user data', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userConsent.findMany.mockResolvedValue([
        {
          documentType: 'TERMS_OF_SERVICE',
          version: '1.0.0',
          acceptedAt: new Date('2024-01-01'),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      ]);
      prisma.resume.findMany.mockResolvedValue([]);
      prisma.auditLog.findMany.mockResolvedValue([]);

      // Act
      const result = await service.exportUserData('user-123');

      // Assert
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.consents).toHaveLength(1);
      expect(result.exportedAt).toBeDefined();
      expect(result.dataRetentionPolicy).toContain('GDPR Article 17');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.exportUserData('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log data export request', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userConsent.findMany.mockResolvedValue([]);
      prisma.resume.findMany.mockResolvedValue([]);
      prisma.auditLog.findMany.mockResolvedValue([]);

      // Act
      await service.exportUserData('user-123');

      // Assert
      expect(auditLog.log).toHaveBeenCalledWith(
        'user-123',
        'DATA_EXPORT_REQUESTED',
        'User',
        'user-123',
        undefined,
        undefined,
      );
    });

    it('should include resume data with all sub-resources', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userConsent.findMany.mockResolvedValue([]);
      prisma.resume.findMany.mockResolvedValue([
        {
          id: 'resume-1',
          title: 'My Resume',
          slug: 'my-resume',
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          fullName: 'Test User',
          jobTitle: 'Developer',
          summary: 'A summary',
          emailContact: 'test@example.com',
          phone: null,
          location: null,
          website: null,
          linkedin: null,
          github: null,
          experiences: [],
          education: [],
          skills: [],
          projects: [],
          certifications: [],
          languages: [],
          openSource: [],
        },
      ]);
      prisma.auditLog.findMany.mockResolvedValue([]);

      // Act
      const result = await service.exportUserData('user-123');

      // Assert
      expect(result.resumes).toHaveLength(1);
      expect(result.resumes[0].title).toBe('My Resume');
      expect(result.resumes[0].personalInfo).toBeDefined();
    });
  });

  describe('logExportDownload', () => {
    it('should log when export is downloaded', async () => {
      // Act
      await service.logExportDownload('user-123');

      // Assert
      expect(auditLog.log).toHaveBeenCalledWith(
        'user-123',
        'DATA_EXPORT_DOWNLOADED',
        'User',
        'user-123',
        undefined,
        undefined,
      );
    });
  });
});
