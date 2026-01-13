/**
 * Email Log Service Tests
 *
 * Tests for email logging and tracking functionality.
 * Follows TDD - RED phase.
 *
 * Kent Beck: "Tests describe behavior, not implementation"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailLogService } from './email-log.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('EmailLogService', () => {
  let service: EmailLogService;
  let mockPrismaService: {
    emailLog: {
      create: ReturnType<typeof mock>;
      findMany: ReturnType<typeof mock>;
      findUnique: ReturnType<typeof mock>;
      update: ReturnType<typeof mock>;
      count: ReturnType<typeof mock>;
    };
  };

  beforeEach(async () => {
    mockPrismaService = {
      emailLog: {
        create: mock(() =>
          Promise.resolve({
            id: 'log-123',
            userId: 'user-123',
            to: 'test@example.com',
            subject: 'Test Email',
            template: 'welcome',
            status: 'PENDING',
            createdAt: new Date(),
          }),
        ),
        findMany: mock(() => Promise.resolve([])),
        findUnique: mock(() => Promise.resolve(null)),
        update: mock(() => Promise.resolve({})),
        count: mock(() => Promise.resolve(0)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailLogService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EmailLogService>(EmailLogService);
  });

  describe('logEmail', () => {
    it('should create email log entry', async () => {
      const result = await service.logEmail({
        userId: 'user-123',
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
      });

      expect(result).toMatchObject({
        id: expect.any(String),
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
        status: 'PENDING',
      });
    });

    it('should create log entry without userId for system emails', async () => {
      await service.logEmail({
        to: 'test@example.com',
        subject: 'System Email',
        template: 'system-alert',
      });

      expect(mockPrismaService.emailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: undefined,
        }),
      });
    });

    it('should store metadata when provided', async () => {
      await service.logEmail({
        userId: 'user-123',
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
        metadata: { resumeId: 'resume-123' },
      });

      expect(mockPrismaService.emailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { resumeId: 'resume-123' },
        }),
      });
    });
  });

  describe('markAsSent', () => {
    it('should update status to SENT and set sentAt', async () => {
      await service.markAsSent('log-123');

      expect(mockPrismaService.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'log-123' },
        data: {
          status: 'SENT',
          sentAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAsFailed', () => {
    it('should update status to FAILED and store error', async () => {
      const errorMessage = 'SMTP connection failed';

      await service.markAsFailed('log-123', errorMessage);

      expect(mockPrismaService.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'log-123' },
        data: {
          status: 'FAILED',
          failedAt: expect.any(Date),
          error: errorMessage,
        },
      });
    });
  });

  describe('getEmailHistory', () => {
    it('should return email history for user', async () => {
      mockPrismaService.emailLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          to: 'test@example.com',
          subject: 'Welcome',
          template: 'welcome',
          status: 'SENT',
          sentAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      const result = await service.getEmailHistory('user-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.emailLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: expect.any(Number),
      });
    });

    it('should support pagination', async () => {
      await service.getEmailHistory('user-123', { skip: 10, take: 20 });

      expect(mockPrismaService.emailLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 20,
      });
    });

    it('should filter by status', async () => {
      await service.getEmailHistory('user-123', { status: 'FAILED' });

      expect(mockPrismaService.emailLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
        take: expect.any(Number),
      });
    });
  });

  describe('getEmailStats', () => {
    it('should return email statistics for user', async () => {
      mockPrismaService.emailLog.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95) // sent
        .mockResolvedValueOnce(5); // failed

      const stats = await service.getEmailStats('user-123');

      expect(stats).toMatchObject({
        total: 100,
        sent: 95,
        failed: 5,
      });
    });
  });

  describe('getPendingEmails', () => {
    it('should return pending emails', async () => {
      mockPrismaService.emailLog.findMany.mockResolvedValue([
        { id: 'log-1', status: 'PENDING' },
        { id: 'log-2', status: 'PENDING' },
      ]);

      const result = await service.getPendingEmails();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.emailLog.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
