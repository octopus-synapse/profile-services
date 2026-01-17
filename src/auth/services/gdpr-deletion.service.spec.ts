import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { GdprDeletionService } from './gdpr-deletion.service';
import { AuthUserRepository } from '../repositories/auth-user.repository';
import { GdprRepository } from '../repositories/gdpr.repository';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { UserNotFoundError } from '@octopus-synapse/profile-contracts';

describe('GdprDeletionService', () => {
  let service: GdprDeletionService;
  let userRepo: AuthUserRepository;
  let gdprRepo: GdprRepository;
  let auditLog: AuditLogService;

  beforeEach(async () => {
    const mockFindById = mock();
    const mockFindUserResumeIds = mock();
    const mockDeleteUserCascading = mock();
    const mockLog = mock();

    userRepo = {
      findByIdWithEmail: mockFindById,
    } as AuthUserRepository;

    gdprRepo = {
      findUserResumeIds: mockFindUserResumeIds,
      deleteUserWithCascade: mockDeleteUserCascading,
    } as GdprRepository;

    auditLog = {
      log: mockLog,
    } as AuditLogService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprDeletionService,
        { provide: AuthUserRepository, useValue: userRepo },
        { provide: GdprRepository, useValue: gdprRepo },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<GdprDeletionService>(GdprDeletionService);
  });

  describe('deleteUserCompletely', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER',
    };

    it('should delete user and all related data', async () => {
      const mockDeletionResult = {
        resumes: 1,
        experiences: 5,
        education: 2,
        skills: 10,
        projects: 3,
        certifications: 1,
        languages: 2,
        openSource: 4,
        consents: 2,
        auditLogs: 15,
        resumeVersions: 1,
        resumeShares: 1,
      };

      (userRepo.findByIdWithEmail as ReturnType<typeof mock>).mockResolvedValue(
        mockUser,
      );
      (gdprRepo.findUserResumeIds as ReturnType<typeof mock>).mockResolvedValue(
        ['resume-1'],
      );
      (
        gdprRepo.deleteUserWithCascade as ReturnType<typeof mock>
      ).mockResolvedValue(mockDeletionResult);

      const result = await service.deleteUserCompletely(
        'user-123',
        'admin-456',
      );

      expect(result.success).toBe(true);
      expect(result.deletedEntities.user).toBe(true);
      expect(result.deletedEntities.resumes).toBe(1);
      expect(result.deletedEntities.experiences).toBe(5);
      expect(result.deletedAt).toBeDefined();
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      (userRepo.findByIdWithEmail as ReturnType<typeof mock>).mockResolvedValue(
        null,
      );

      await expect(
        service.deleteUserCompletely('non-existent', 'admin-456'),
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should delete user completely when requested', async () => {
      const mockDeletionResult = {
        resumes: 0,
        experiences: 0,
        education: 0,
        skills: 0,
        projects: 0,
        certifications: 0,
        languages: 0,
        openSource: 0,
        consents: 0,
        auditLogs: 0,
        resumeVersions: 0,
        resumeShares: 0,
      };

      (userRepo.findByIdWithEmail as ReturnType<typeof mock>).mockResolvedValue(
        mockUser,
      );
      (gdprRepo.findUserResumeIds as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );
      (
        gdprRepo.deleteUserWithCascade as ReturnType<typeof mock>
      ).mockResolvedValue(mockDeletionResult);

      const result = await service.deleteUserCompletely(
        'user-123',
        'admin-456',
      );

      expect(result.success).toBe(true);
    });

    it('should log deletion when admin deletes another user', async () => {
      const mockDeletionResult = {
        resumes: 0,
        experiences: 0,
        education: 0,
        skills: 0,
        projects: 0,
        certifications: 0,
        languages: 0,
        openSource: 0,
        consents: 0,
        auditLogs: 0,
        resumeVersions: 0,
        resumeShares: 0,
      };

      (userRepo.findByIdWithEmail as ReturnType<typeof mock>).mockResolvedValue(
        mockUser,
      );
      (gdprRepo.findUserResumeIds as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );
      (
        gdprRepo.deleteUserWithCascade as ReturnType<typeof mock>
      ).mockResolvedValue(mockDeletionResult);

      await service.deleteUserCompletely('user-123', 'admin-456');

      expect(auditLog.log).toHaveBeenCalled();
    });
  });

  describe('requestSelfDeletion', () => {
    it('should call deleteUserCompletely with same userId', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      };

      const mockDeletionResult = {
        resumes: 0,
        experiences: 0,
        education: 0,
        skills: 0,
        projects: 0,
        certifications: 0,
        languages: 0,
        openSource: 0,
        consents: 0,
        auditLogs: 0,
        resumeVersions: 0,
        resumeShares: 0,
      };

      (userRepo.findByIdWithEmail as ReturnType<typeof mock>).mockResolvedValue(
        mockUser,
      );
      (gdprRepo.findUserResumeIds as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );
      (
        gdprRepo.deleteUserWithCascade as ReturnType<typeof mock>
      ).mockResolvedValue(mockDeletionResult);

      const result = await service.requestSelfDeletion('user-123');

      expect(result.success).toBe(true);
    });
  });
});
