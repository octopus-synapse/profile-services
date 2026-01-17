import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { GdprExportService } from './gdpr-export.service';
import { AuthUserRepository } from '../repositories/auth-user.repository';
import { UserConsentRepository } from '../repositories/user-consent.repository';
import { GdprRepository } from '../repositories/gdpr.repository';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { UserNotFoundError } from '@octopus-synapse/profile-contracts';

describe('GdprExportService', () => {
  let service: GdprExportService;
  let userRepo: AuthUserRepository;
  let consentRepo: UserConsentRepository;
  let gdprRepo: GdprRepository;
  let auditLog: AuditLogService;

  beforeEach(async () => {
    const mockFindByIdForExport = mock();
    const mockFindAllByUserIdForExport = mock();
    const mockFindResumesWithRelationsForExport = mock();
    const mockFindAuditLogsForExport = mock();
    const mockLog = mock();

    userRepo = {
      findByIdForExport: mockFindByIdForExport,
    } as AuthUserRepository;

    consentRepo = {
      findAllByUserIdForExport: mockFindAllByUserIdForExport,
    } as UserConsentRepository;

    gdprRepo = {
      findResumesWithRelationsForExport: mockFindResumesWithRelationsForExport,
      findAuditLogsForExport: mockFindAuditLogsForExport,
    } as GdprRepository;

    auditLog = {
      log: mockLog,
    } as AuditLogService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprExportService,
        { provide: AuthUserRepository, useValue: userRepo },
        { provide: UserConsentRepository, useValue: consentRepo },
        { provide: GdprRepository, useValue: gdprRepo },
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
      hasCompletedOnboarding: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    it('should export all user data', async () => {
      (userRepo.findByIdForExport as ReturnType<typeof mock>).mockResolvedValue(
        mockUser,
      );
      (
        consentRepo.findAllByUserIdForExport as ReturnType<typeof mock>
      ).mockResolvedValue([
        {
          documentType: 'TERMS_OF_SERVICE',
          version: '1.0.0',
          acceptedAt: new Date('2024-01-01'),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      ]);
      (
        gdprRepo.findResumesWithRelationsForExport as ReturnType<typeof mock>
      ).mockResolvedValue([]);
      (
        gdprRepo.findAuditLogsForExport as ReturnType<typeof mock>
      ).mockResolvedValue([]);

      const result = await service.exportUserData('user-123');

      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.consents).toHaveLength(1);
      expect(result.exportedAt).toBeDefined();
      expect(result.dataRetentionPolicy).toContain('GDPR Article 17');
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      (userRepo.findByIdForExport as ReturnType<typeof mock>).mockResolvedValue(
        null,
      );

      await expect(service.exportUserData('non-existent')).rejects.toThrow(
        UserNotFoundError,
      );
    });

    it('should log data export request', async () => {
      (userRepo.findByIdForExport as ReturnType<typeof mock>).mockResolvedValue(
        mockUser,
      );
      (
        consentRepo.findAllByUserIdForExport as ReturnType<typeof mock>
      ).mockResolvedValue([]);
      (
        gdprRepo.findResumesWithRelationsForExport as ReturnType<typeof mock>
      ).mockResolvedValue([]);
      (
        gdprRepo.findAuditLogsForExport as ReturnType<typeof mock>
      ).mockResolvedValue([]);

      await service.exportUserData('user-123');

      expect(auditLog.log).toHaveBeenCalled();
    });

    it('should include resume data with all sub-resources', async () => {
      const mockResume = {
        id: 'resume-1',
        userId: 'user-123',
        title: 'My Resume',
        slug: 'my-resume',
        isPublic: false,
        fullName: 'John Doe',
        jobTitle: 'Developer',
        summary: 'A developer',
        emailContact: 'john@example.com',
        phone: null,
        location: null,
        website: null,
        linkedin: null,
        github: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        experiences: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        languages: [],
        openSource: [],
      };

      (userRepo.findByIdForExport as ReturnType<typeof mock>).mockResolvedValue(
        mockUser,
      );
      (
        consentRepo.findAllByUserIdForExport as ReturnType<typeof mock>
      ).mockResolvedValue([]);
      (
        gdprRepo.findResumesWithRelationsForExport as ReturnType<typeof mock>
      ).mockResolvedValue([mockResume]);
      (
        gdprRepo.findAuditLogsForExport as ReturnType<typeof mock>
      ).mockResolvedValue([]);

      const result = await service.exportUserData('user-123');

      expect(result.resumes).toHaveLength(1);
      expect(result.resumes[0].id).toBe('resume-1');
    });

    it('should log when export is downloaded', async () => {
      (userRepo.findByIdForExport as ReturnType<typeof mock>).mockResolvedValue(
        mockUser,
      );
      (
        consentRepo.findAllByUserIdForExport as ReturnType<typeof mock>
      ).mockResolvedValue([]);
      (
        gdprRepo.findResumesWithRelationsForExport as ReturnType<typeof mock>
      ).mockResolvedValue([]);
      (
        gdprRepo.findAuditLogsForExport as ReturnType<typeof mock>
      ).mockResolvedValue([]);

      await service.exportUserData('user-123');

      expect(auditLog.log).toHaveBeenCalled();
    });
  });
});
