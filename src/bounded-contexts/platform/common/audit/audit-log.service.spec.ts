/**
 * AuditLogService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável.
 * Audit é crítico para compliance, então testamos a criação de logs.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AppLoggerService } from '../logger/logger.service';
import { AuditAction } from '@prisma/client';

describe('AuditLogService', () => {
  let service: AuditLogService;

  const auditLogs: any[] = [];

  const stubPrisma = {
    auditLog: {
      create: mock().mockImplementation(({ data }) => {
        const log = {
          id: `log-${auditLogs.length + 1}`,
          ...data,
          createdAt: new Date(),
        };
        auditLogs.push(log);
        return Promise.resolve(log);
      }),
      findMany: mock().mockImplementation(({ where }) => {
        return Promise.resolve(
          auditLogs.filter((log) => {
            if (where?.userId) return log.userId === where.userId;
            if (where?.action) return log.action === where.action;
            return true;
          }),
        );
      }),
      deleteMany: mock().mockResolvedValue({ count: 5 }),
    },
  };

  const stubLogger = {
    debug: mock(),
    error: mock(),
    log: mock(),
  };

  beforeEach(async () => {
    auditLogs.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: stubPrisma },
        { provide: AppLoggerService, useValue: stubLogger },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  describe('log', () => {
    it('should create audit log entry', async () => {
      await service.log(
        'user-1',
        AuditAction.USERNAME_CHANGED,
        'User',
        'user-1',
        { before: { username: 'old' }, after: { username: 'new' } },
      );

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        userId: 'user-1',
        action: AuditAction.USERNAME_CHANGED,
        entityType: 'User',
        entityId: 'user-1',
      });
    });

    it('should extract request metadata when provided', async () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '10.0.0.1',
          referer: 'https://example.com',
        },
        method: 'POST',
        path: '/api/users',
        socket: { remoteAddress: '127.0.0.1' },
      } as any;

      await service.log(
        'user-1',
        AuditAction.USERNAME_CHANGED,
        'User',
        'user-1',
        undefined,
        mockRequest,
      );

      expect(auditLogs[0].ipAddress).toBe('10.0.0.1');
      expect(auditLogs[0].userAgent).toBe('Mozilla/5.0');
    });

    it('should not throw on prisma errors', async () => {
      stubPrisma.auditLog.create.mockRejectedValueOnce(new Error('DB error'));

      // Should not throw
      await expect(
        service.log('user-1', AuditAction.USERNAME_CHANGED, 'User', 'user-1'),
      ).resolves.toBeUndefined();

      expect(stubLogger.error).toHaveBeenCalled();
    });
  });

  describe('logUsernameChange', () => {
    it('should log username change with before/after', async () => {
      await service.logUsernameChange('user-1', 'oldname', 'newname');

      expect(auditLogs[0]).toMatchObject({
        action: AuditAction.USERNAME_CHANGED,
        changesBefore: { username: 'oldname' },
        changesAfter: { username: 'newname' },
      });
    });
  });

  describe('logResumeDeletion', () => {
    it('should log resume deletion with data snapshot', async () => {
      const resumeData = { title: 'My Resume', id: 'r-1' };

      await service.logResumeDeletion('user-1', 'resume-1', resumeData);

      expect(auditLogs[0]).toMatchObject({
        action: AuditAction.RESUME_DELETED,
        entityType: 'Resume',
        entityId: 'resume-1',
        changesBefore: resumeData,
      });
    });
  });

  describe('logVisibilityChange', () => {
    it('should log visibility change', async () => {
      await service.logVisibilityChange('user-1', 'resume-1', false, true);

      expect(auditLogs[0]).toMatchObject({
        action: AuditAction.RESUME_VISIBILITY_CHANGED,
        changesBefore: { isPublic: false },
        changesAfter: { isPublic: true },
      });
    });
  });

  describe('logUnauthorizedAccess', () => {
    it('should log unauthorized access attempt', async () => {
      await service.logUnauthorizedAccess('user-1', 'Resume', 'resume-123');

      expect(auditLogs[0]).toMatchObject({
        action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
        entityType: 'Resume',
        entityId: 'resume-123',
      });
    });
  });

  describe('getUserLogs', () => {
    it('should return logs for specific user', async () => {
      // Create some logs
      await service.log(
        'user-1',
        AuditAction.USERNAME_CHANGED,
        'User',
        'user-1',
      );
      await service.log(
        'user-2',
        AuditAction.USERNAME_CHANGED,
        'User',
        'user-2',
      );
      await service.log('user-1', AuditAction.RESUME_DELETED, 'Resume', 'r-1');

      const result = await service.getUserLogs('user-1');

      expect(result).toHaveLength(2);
      expect(result.every((log) => log.userId === 'user-1')).toBe(true);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old logs and return count', async () => {
      const result = await service.cleanupOldLogs(90);

      expect(result).toBe(5);
      expect(stubLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 5 audit logs'),
        'AuditLogService',
      );
    });
  });
});
