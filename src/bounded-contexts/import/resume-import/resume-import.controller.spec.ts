/**
 * Resume Import Controller Tests
 *
 * Tests for resume import REST API endpoints.
 * TDD: RED phase - write tests first.
 *
 * Kent Beck: "Tests describe expected behavior"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeImportController } from './resume-import.controller';
import { ResumeImportService } from './resume-import.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ResumeImportController', () => {
  let controller: ResumeImportController;
  let mockImportService: {
    createImportJob: ReturnType<typeof mock>;
    processImport: ReturnType<typeof mock>;
    getImportById: ReturnType<typeof mock>;
    getImportHistory: ReturnType<typeof mock>;
    cancelImport: ReturnType<typeof mock>;
    retryImport: ReturnType<typeof mock>;
    parseJsonResume: ReturnType<typeof mock>;
  };

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    hasCompletedOnboarding: true,
  };

  beforeEach(async () => {
    mockImportService = {
      createImportJob: mock(() =>
        Promise.resolve({
          id: 'import-123',
          userId: 'user-123',
          source: 'JSON',
          status: 'PENDING',
        }),
      ),
      processImport: mock(() =>
        Promise.resolve({
          importId: 'import-123',
          status: 'COMPLETED',
          resumeId: 'resume-123',
        }),
      ),
      getImportById: mock(() =>
        Promise.resolve({
          id: 'import-123',
          userId: 'user-123',
          source: 'JSON',
          status: 'COMPLETED',
          resumeId: 'resume-123',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        }),
      ),
      getImportHistory: mock(() =>
        Promise.resolve([
          {
            id: 'import-1',
            status: 'COMPLETED',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
          {
            id: 'import-2',
            status: 'FAILED',
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
          },
        ]),
      ),
      cancelImport: mock(() => Promise.resolve()),
      retryImport: mock(() =>
        Promise.resolve({
          importId: 'import-123',
          status: 'COMPLETED',
        }),
      ),
      parseJsonResume: mock(() => ({
        personalInfo: { name: 'John Doe' },
        experiences: [],
        education: [],
        skills: [],
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumeImportController],
      providers: [
        { provide: ResumeImportService, useValue: mockImportService },
      ],
    }).compile();

    controller = module.get<ResumeImportController>(ResumeImportController);
  });

  describe('importJson', () => {
    it('should create import job and process JSON resume', async () => {
      const jsonData = {
        basics: { name: 'John Doe', email: 'john@example.com' },
        work: [],
        education: [],
      };

      const result = await controller.importJson(mockUser, { data: jsonData });

      expect(result).toMatchObject({
        importId: expect.any(String),
        status: 'COMPLETED',
        resumeId: expect.any(String),
      });
      expect(mockImportService.createImportJob).toHaveBeenCalled();
      expect(mockImportService.processImport).toHaveBeenCalled();
    });

    it('should validate JSON before importing', async () => {
      const invalidJson = { invalid: 'data' };

      await expect(
        controller.importJson(mockUser, { data: invalidJson }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('parseJson', () => {
    it('should parse JSON Resume without saving', async () => {
      const jsonData = {
        basics: { name: 'Jane Doe' },
        work: [{ name: 'Company', position: 'Developer' }],
      };

      const result = await controller.parseJson({ data: jsonData });

      expect(result).toMatchObject({
        personalInfo: { name: 'John Doe' },
        experiences: expect.any(Array),
      });
      expect(mockImportService.parseJsonResume).toHaveBeenCalledWith(jsonData);
    });
  });

  describe('getStatus', () => {
    it('should return import status', async () => {
      const result = await controller.getStatus(mockUser, 'import-123');

      expect(result).toMatchObject({
        status: 'COMPLETED',
        resumeId: 'resume-123',
      });
      expect(mockImportService.getImportById).toHaveBeenCalledWith(
        'import-123',
      );
    });

    it('should throw NotFoundException for unknown import', async () => {
      mockImportService.getImportById.mockImplementationOnce(() =>
        Promise.reject(new NotFoundException('Import not found')),
      );

      await expect(controller.getStatus(mockUser, 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getHistory', () => {
    it('should return import history for user', async () => {
      const result = await controller.getHistory(mockUser);

      expect(result).toHaveLength(2);
      expect(mockImportService.getImportHistory).toHaveBeenCalledWith(
        mockUser.userId,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel pending import', async () => {
      await controller.cancel(mockUser, 'import-123');

      expect(mockImportService.cancelImport).toHaveBeenCalledWith('import-123');
    });
  });

  describe('retry', () => {
    it('should retry failed import', async () => {
      const result = await controller.retry(mockUser, 'import-123');

      expect(result).toMatchObject({
        importId: 'import-123',
        status: 'COMPLETED',
      });
      expect(mockImportService.retryImport).toHaveBeenCalledWith('import-123');
    });
  });
});
