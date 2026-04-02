/**
 * Resume Import Service Tests
 *
 * Tests for resume import functionality (JSON format MVP).
 * Follows TDD - RED phase.
 *
 * Kent Beck: "Tests describe behavior, not implementation"
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { InMemoryResumeImportRepository, InMemoryResumeRepository, NullLogger } from '../testing';
import { ResumeImportService } from './resume-import.service';
import type { JsonResumeSchema } from './resume-import.types';

describe('ResumeImportService', () => {
  let service: ResumeImportService;
  let importRepository: InMemoryResumeImportRepository;
  let resumeRepository: InMemoryResumeRepository;
  let logger: NullLogger;

  beforeEach(async () => {
    importRepository = new InMemoryResumeImportRepository();
    resumeRepository = new InMemoryResumeRepository();
    logger = new NullLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeImportService,
        {
          provide: PrismaService,
          useValue: {
            resumeImport: {
              create: (args: { data: Parameters<typeof importRepository.create>[0] }) =>
                importRepository.create(args.data),
              findUnique: (args: { where: { id: string } }) =>
                importRepository.findUnique(args.where.id),
              findMany: (args: { where: { userId: string } }) => importRepository.findMany(args),
              update: (args: { where: { id: string }; data: Record<string, unknown> }) =>
                importRepository.update(args.where.id, args.data),
              delete: (args: { where: { id: string } }) => importRepository.delete(args.where.id),
            },
            resume: {
              create: (args: { data: Parameters<typeof resumeRepository.create>[0] }) =>
                resumeRepository.create(args.data),
            },
          },
        },
        { provide: AppLoggerService, useValue: logger },
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

      const result = await service.createImportJob({
        userId: 'user-123',
        source: 'JSON',
        rawData,
      });

      const importJob = await importRepository.findUnique(result.id);
      expect(importJob?.rawData).toEqual(rawData);
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
      expect(parsed.personalInfo.linkedin).toBe('https://linkedin.com/in/johndoe');

      const workSection = parsed.sections.find((s) => s.sectionTypeKey === 'work_experience_v1');
      expect(workSection?.items).toHaveLength(1);
      expect(workSection?.items[0].company).toBe('TechCorp');
      expect(workSection?.items[0].position).toBe('Senior Engineer');

      const eduSection = parsed.sections.find((s) => s.sectionTypeKey === 'education_v1');
      expect(eduSection?.items).toHaveLength(1);

      const skillSection = parsed.sections.find((s) => s.sectionTypeKey === 'skill_v1');
      expect(skillSection?.items.map((i) => i.name)).toContain('JavaScript');
    });

    it('should handle missing optional fields', () => {
      const minimalJson: JsonResumeSchema = {
        basics: {
          name: 'Jane Doe',
        },
      };

      const parsed = service.parseJsonResume(minimalJson);

      expect(parsed.personalInfo.name).toBe('Jane Doe');
      expect(parsed.sections).toHaveLength(0);
    });

    it('should flatten skills from nested structure', () => {
      const jsonResume: JsonResumeSchema = {
        skills: [
          { name: 'Frontend', keywords: ['React', 'Vue', 'Angular'] },
          { name: 'Backend', keywords: ['Node.js', 'Python'] },
        ],
      };

      const parsed = service.parseJsonResume(jsonResume);

      const skillSection = parsed.sections.find((s) => s.sectionTypeKey === 'skill_v1');
      const skillNames = skillSection?.items.map((i) => i.name) ?? [];
      expect(skillNames).toContain('React');
      expect(skillNames).toContain('Vue');
      expect(skillNames).toContain('Node.js');
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

      const importJob = await importRepository.create({
        userId: 'user-123',
        source: 'JSON' as const,
        status: 'PENDING',
        rawData: jsonResume as unknown as Prisma.InputJsonValue,
      });

      const result = await service.processImport(importJob.id);

      expect(result.status).toBe('COMPLETED');
      expect(result.resumeId).toBeDefined();
    });

    it('should update status during processing', async () => {
      const importJob = await importRepository.create({
        userId: 'user-123',
        source: 'JSON' as const,
        status: 'PENDING',
        rawData: { basics: { name: 'Test' } } as Prisma.InputJsonValue,
      });

      await service.processImport(importJob.id);

      // Verify status was updated
      const updated = await importRepository.findUnique(importJob.id);
      expect(updated?.status).toBe('COMPLETED');
    });

    it('should handle import not found', async () => {
      await expect(service.processImport('invalid-id')).rejects.toThrow('Import not found');
    });

    it('should mark as failed on error', async () => {
      const importJob = await importRepository.create({
        userId: 'user-123',
        source: 'JSON' as const,
        status: 'PENDING',
        rawData: undefined, // Invalid - no data
      });

      const result = await service.processImport(importJob.id);

      expect(result.status).toBe('FAILED');
      expect(result.errors).toBeDefined();
    });
  });

  describe('getImportStatus', () => {
    it('should return import status', async () => {
      const importJob = await importRepository.create({
        userId: 'user-123',
        source: 'JSON',
        status: 'COMPLETED',
      });
      await importRepository.update(importJob.id, { resumeId: 'resume-123' });

      const status = await service.getImportStatus(importJob.id);

      expect(status).toMatchObject({
        status: 'COMPLETED',
        resumeId: 'resume-123',
      });
    });
  });

  describe('getImportHistory', () => {
    it('should return import history for user', async () => {
      await importRepository.create({
        userId: 'user-123',
        source: 'JSON',
        status: 'COMPLETED',
      });
      await importRepository.create({
        userId: 'user-123',
        source: 'JSON',
        status: 'FAILED',
      });

      const history = await service.getImportHistory('user-123');

      expect(history).toHaveLength(2);
    });
  });

  describe('cancelImport', () => {
    it('should cancel pending import', async () => {
      const importJob = await importRepository.create({
        userId: 'user-123',
        source: 'JSON',
        status: 'PENDING',
      });

      await service.cancelImport(importJob.id);

      const deleted = await importRepository.findUnique(importJob.id);
      expect(deleted).toBeNull();
    });

    it('should not cancel completed import', async () => {
      const importJob = await importRepository.create({
        userId: 'user-123',
        source: 'JSON',
        status: 'COMPLETED',
      });

      await expect(service.cancelImport(importJob.id)).rejects.toThrow(
        'Cannot cancel completed import',
      );
    });
  });

  describe('retryImport', () => {
    it('should retry failed import', async () => {
      const importJob = await importRepository.create({
        userId: 'user-123',
        source: 'JSON',
        status: 'FAILED',
        rawData: { basics: { name: 'Test' } },
      });

      const result = await service.retryImport(importJob.id);

      expect(result.status).toBeDefined();
    });

    it('should not retry non-failed import', async () => {
      const importJob = await importRepository.create({
        userId: 'user-123',
        source: 'JSON',
        status: 'COMPLETED',
      });

      await expect(service.retryImport(importJob.id)).rejects.toThrow(
        'Can only retry failed imports',
      );
    });
  });
});
