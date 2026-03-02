import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { GdprDeletionService } from './gdpr-deletion.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { NotFoundException } from '@nestjs/common';

describe('GdprDeletionService', () => {
  let service: GdprDeletionService;
  let prisma: any;
  let auditLog: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: mock(),
        count: mock(),
        delete: mock(),
      },
      resume: {
        findMany: mock(),
        deleteMany: mock(),
      },
      resumeSection: { deleteMany: mock() },
      sectionItem: { deleteMany: mock() },
      resumeVersion: { deleteMany: mock() },
      resumeAnalytics: { deleteMany: mock() },
      userConsent: { deleteMany: mock() },
      auditLog: { deleteMany: mock() },
      $transaction: mock(),
    };

    auditLog = {
      log: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprDeletionService,
        { provide: PrismaService, useValue: prisma },
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
      // Arrange
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.resume.findMany.mockResolvedValue([{ id: 'resume-1' }]);
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {
            resumeSection: { deleteMany: mock(() => ({ count: 4 })) },
            sectionItem: { deleteMany: mock(() => ({ count: 18 })) },
            resumeVersion: { deleteMany: mock(() => ({ count: 1 })) },
            resumeShare: { deleteMany: mock(() => ({ count: 1 })) },
            resume: { deleteMany: mock(() => ({ count: 1 })) },
            userConsent: { deleteMany: mock(() => ({ count: 2 })) },
            auditLog: { deleteMany: mock(() => ({ count: 15 })) },
            user: { delete: mock() },
          };
          return callback(mockTx);
        },
      );

      // Act
      const result = await service.deleteUserCompletely(
        'user-123',
        'admin-456',
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.deletedEntities.user).toBe(true);
      expect(result.deletedEntities.resumes).toBe(1);
      expect(result.deletedEntities.resumeSections).toBe(4);
      expect(result.deletedEntities.sectionItems).toBe(18);
      expect(result.deletedAt).toBeDefined();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteUserCompletely('non-existent', 'admin-456'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete user completely when requested', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
      });
      prisma.resume.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {
            resumeSection: { deleteMany: mock(() => ({ count: 0 })) },
            sectionItem: { deleteMany: mock(() => ({ count: 0 })) },
            resumeVersion: { deleteMany: mock(() => ({ count: 0 })) },
            resumeShare: { deleteMany: mock(() => ({ count: 0 })) },
            resume: { deleteMany: mock(() => ({ count: 0 })) },
            userConsent: { deleteMany: mock(() => ({ count: 0 })) },
            auditLog: { deleteMany: mock(() => ({ count: 0 })) },
            user: { delete: mock() },
          };
          return callback(mockTx);
        },
      );

      // Act
      const result = await service.deleteUserCompletely(
        'admin-123',
        'admin-456',
      );

      // Assert
      expect(result.success).toBe(true);
    });

    it('should log deletion when admin deletes another user', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.resume.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {
            resumeSection: { deleteMany: mock(() => ({ count: 0 })) },
            sectionItem: { deleteMany: mock(() => ({ count: 0 })) },
            resumeVersion: { deleteMany: mock(() => ({ count: 0 })) },
            resumeShare: { deleteMany: mock(() => ({ count: 0 })) },
            resume: { deleteMany: mock(() => ({ count: 0 })) },
            userConsent: { deleteMany: mock(() => ({ count: 0 })) },
            auditLog: { deleteMany: mock(() => ({ count: 0 })) },
            user: { delete: mock() },
          };
          return callback(mockTx);
        },
      );

      // Act
      await service.deleteUserCompletely('user-123', 'admin-456');

      // Assert
      expect(auditLog.log).toHaveBeenCalledWith(
        'admin-456',
        'ACCOUNT_DELETED',
        'User',
        'user-123',
        { before: { email: 'test@example.com' } },
        undefined,
      );
    });
  });

  describe('requestSelfDeletion', () => {
    it('should call deleteUserCompletely with same userId', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });
      prisma.resume.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {
            resumeSection: { deleteMany: mock(() => ({ count: 0 })) },
            sectionItem: { deleteMany: mock(() => ({ count: 0 })) },
            resumeVersion: { deleteMany: mock(() => ({ count: 0 })) },
            resumeShare: { deleteMany: mock(() => ({ count: 0 })) },
            resume: { deleteMany: mock(() => ({ count: 0 })) },
            userConsent: { deleteMany: mock(() => ({ count: 0 })) },
            auditLog: { deleteMany: mock(() => ({ count: 0 })) },
            user: { delete: mock() },
          };
          return callback(mockTx);
        },
      );

      // Act
      const result = await service.requestSelfDeletion('user-123');

      // Assert
      expect(result.success).toBe(true);
      // Self-deletion should not log (user's audit log is deleted)
      expect(auditLog.log).not.toHaveBeenCalled();
    });
  });
});
