/**
 * Resume Import Service Tests
 *
 * Tests for resume import functionality (JSON format MVP).
 * Follows TDD - RED phase.
 *
 * Kent Beck: "Tests describe behavior, not implementation"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeImportService } from './resume-import.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger/logger.service';
import type { JsonResumeSchema, ParsedResumeData } from './resume-import.types';

describe('ResumeImportService', () => {
  let service: ResumeImportService;
  let mockPrismaService: {
    resumeImport: {
      create: ReturnType<typeof mock>;
      findUnique: ReturnType<typeof mock>;
      findMany: ReturnType<typeof mock>;
      update: ReturnType<typeof mock>;
      delete: ReturnType<typeof mock>;
    };
    resume: {
      create: ReturnType<typeof mock>;
    };
  };

  beforeEach(async () => {
    mockPrismaService = {
      resumeImport: {
        create: mock(() =>
          Promise.resolve({
            id: 'import-123',
            userId: 'user-123',
            source: 'JSON',
            status: 'PENDING',
            createdAt: new Date(),
          }),
        ),
        findUnique: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
        update: mock(() => Promise.resolve({})),
        delete: mock(() => Promise.resolve({})),
      },
      resume: {
        create: mock(() =>
          Promise.resolve({
            id: 'resume-123',
            userId: 'user-123',
          }),
        ),
      },
    };

    const mockLogger = {
      log: mock(),
      warn: mock(),
      error: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeImportService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ResumeImportService>(ResumeImportService);
  });

  describe('createImportJob', () => {
    it('should create an import job', async () => {
      const result = await service.createImportJob({
        userId: 'user-123',
        source: 'JSON',
      });

      expect(result).toMatchObject({
        id: expect.any(String),
        status: 'PENDING',
      });
    });

    it('should store raw data when provided', async () => {
      const rawData = { basics: { name: 'Test User' } };

      await service.createImportJob({
        userId: 'user-123',
        source: 'JSON',
        rawData,
      });

      expect(mockPrismaService.resumeImport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rawData,
        }),
      });
    });
  });

  describe('parseJsonResume', () => {
    it('should parse JSON Resume format', () => {
      const jsonResume: JsonResumeSchema = {
        basics: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          summary: 'Software engineer with 5 years experience',
          location: {
            city: 'San Francisco',
            region: 'CA',
          },
          profiles: [
            { network: 'LinkedIn', url: 'https://linkedin.com/in/johndoe' },
            { network: 'GitHub', url: 'https://github.com/johndoe' },
          ],
        },
        work: [
          {
            name: 'TechCorp',
            position: 'Senior Engineer',
            startDate: '2020-01-01',
            endDate: '2023-12-31',
            summary: 'Built scalable systems',
            highlights: ['Led team of 5', 'Increased performance by 50%'],
          },
        ],
        education: [
          {
            institution: 'MIT',
            area: 'Computer Science',
            studyType: 'Bachelor',
            startDate: '2014-09-01',
            endDate: '2018-06-01',
          },
        ],
        skills: [
          { name: 'JavaScript', keywords: ['Node.js', 'React'] },
          { name: 'Python', keywords: ['Django', 'FastAPI'] },
        ],
      };

      const parsed = service.parseJsonResume(jsonResume);

      expect(parsed.personalInfo.name).toBe('John Doe');
      expect(parsed.personalInfo.email).toBe('john@example.com');
      expect(parsed.personalInfo.linkedin).toBe(
        'https://linkedin.com/in/johndoe',
      );
      expect(parsed.experiences).toHaveLength(1);
      expect(parsed.experiences[0].company).toBe('TechCorp');
      expect(parsed.experiences[0].title).toBe('Senior Engineer');
      expect(parsed.education).toHaveLength(1);
      expect(parsed.skills).toContain('JavaScript');
    });

    it('should handle missing optional fields', () => {
      const minimalJson: JsonResumeSchema = {
        basics: {
          name: 'Jane Doe',
        },
      };

      const parsed = service.parseJsonResume(minimalJson);

      expect(parsed.personalInfo.name).toBe('Jane Doe');
      expect(parsed.experiences).toHaveLength(0);
      expect(parsed.education).toHaveLength(0);
      expect(parsed.skills).toHaveLength(0);
    });

    it('should flatten skills from nested structure', () => {
      const jsonResume: JsonResumeSchema = {
        skills: [
          { name: 'Frontend', keywords: ['React', 'Vue', 'Angular'] },
          { name: 'Backend', keywords: ['Node.js', 'Python'] },
        ],
      };

      const parsed = service.parseJsonResume(jsonResume);

      expect(parsed.skills).toContain('React');
      expect(parsed.skills).toContain('Vue');
      expect(parsed.skills).toContain('Node.js');
    });
  });

  describe('processImport', () => {
    it('should process JSON import and create resume', async () => {
      const jsonResume: JsonResumeSchema = {
        basics: { name: 'Test User' },
        work: [
          {
            name: 'Company',
            position: 'Developer',
            startDate: '2020-01-01',
          },
        ],
      };

      mockPrismaService.resumeImport.findUnique.mockResolvedValue({
        id: 'import-123',
        userId: 'user-123',
        source: 'JSON',
        status: 'PENDING',
        rawData: jsonResume,
      });

      const result = await service.processImport('import-123');

      expect(result.status).toBe('COMPLETED');
      expect(result.resumeId).toBeDefined();
    });

    it('should update status during processing', async () => {
      mockPrismaService.resumeImport.findUnique.mockResolvedValue({
        id: 'import-123',
        userId: 'user-123',
        source: 'JSON',
        status: 'PENDING',
        rawData: { basics: { name: 'Test' } },
      });

      await service.processImport('import-123');

      // Should have been updated multiple times (PROCESSING -> MAPPING -> etc)
      expect(mockPrismaService.resumeImport.update).toHaveBeenCalled();
    });

    it('should handle import not found', async () => {
      mockPrismaService.resumeImport.findUnique.mockResolvedValue(null);

      await expect(service.processImport('invalid-id')).rejects.toThrow(
        'Import not found',
      );
    });

    it('should mark as failed on error', async () => {
      mockPrismaService.resumeImport.findUnique.mockResolvedValue({
        id: 'import-123',
        userId: 'user-123',
        source: 'JSON',
        status: 'PENDING',
        rawData: null, // Invalid - no data
      });

      const result = await service.processImport('import-123');

      expect(result.status).toBe('FAILED');
      expect(result.errors).toBeDefined();
    });
  });

  describe('getImportStatus', () => {
    it('should return import status', async () => {
      mockPrismaService.resumeImport.findUnique.mockResolvedValue({
        id: 'import-123',
        status: 'COMPLETED',
        resumeId: 'resume-123',
      });

      const status = await service.getImportStatus('import-123');

      expect(status).toMatchObject({
        status: 'COMPLETED',
        resumeId: 'resume-123',
      });
    });
  });

  describe('getImportHistory', () => {
    it('should return import history for user', async () => {
      mockPrismaService.resumeImport.findMany.mockResolvedValue([
        { id: 'import-1', status: 'COMPLETED' },
        { id: 'import-2', status: 'FAILED' },
      ]);

      const history = await service.getImportHistory('user-123');

      expect(history).toHaveLength(2);
    });
  });

  describe('cancelImport', () => {
    it('should cancel pending import', async () => {
      mockPrismaService.resumeImport.findUnique.mockResolvedValue({
        id: 'import-123',
        status: 'PENDING',
      });

      await service.cancelImport('import-123');

      expect(mockPrismaService.resumeImport.delete).toHaveBeenCalled();
    });

    it('should not cancel completed import', async () => {
      mockPrismaService.resumeImport.findUnique.mockResolvedValue({
        id: 'import-123',
        status: 'COMPLETED',
      });

      await expect(service.cancelImport('import-123')).rejects.toThrow(
        'Cannot cancel completed import',
      );
    });
  });

  describe('retryImport', () => {
    it('should retry failed import', async () => {
      mockPrismaService.resumeImport.findUnique.mockResolvedValue({
        id: 'import-123',
        userId: 'user-123',
        source: 'JSON',
        status: 'FAILED',
        rawData: { basics: { name: 'Test' } },
      });

      const result = await service.retryImport('import-123');

      expect(result.status).toBeDefined();
    });

    it('should not retry non-failed import', async () => {
      mockPrismaService.resumeImport.findUnique.mockResolvedValue({
        id: 'import-123',
        status: 'COMPLETED',
      });

      await expect(service.retryImport('import-123')).rejects.toThrow(
        'Can only retry failed imports',
      );
    });
  });
});
