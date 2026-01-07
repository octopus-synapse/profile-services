/**
 * Education Service Bug Detection Tests
 *
 * BUG-019: Education Service Missing Date Validation
 * BUG-052: Order Not Validated
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EducationService } from './education.service';
import { ResumesRepository } from '../resumes.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';

describe('EducationService - BUG DETECTION', () => {
  let service: EducationService;
  let mockPrisma: any;
  let mockResumesRepo: any;

  const mockResume = {
    id: 'resume-123',
    userId: 'user-123',
  };

  beforeEach(async () => {
    mockPrisma = {
      education: {
        findMany: mock().mockResolvedValue([]),
        create: mock(),
        update: mock(),
        delete: mock(),
      },
    };

    mockResumesRepo = {
      findOne: mock().mockResolvedValue(mockResume),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EducationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ResumesRepository, useValue: mockResumesRepo },
        { provide: AppLoggerService, useValue: { log: mock() } },
      ],
    }).compile();

    service = module.get<EducationService>(EducationService);
  });

  describe('BUG-019: Missing Date Validation', () => {
    /**
     * ExperienceService validates:
     * - isCurrent=true → endDate must be null
     * - endDate must be after startDate
     *
     * EducationService has same date fields but NO validation!
     */
    it('should REJECT isCurrent=true with endDate set', async () => {
      const invalidDto = {
        institution: 'MIT',
        degree: 'BS',
        field: 'Computer Science',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2021-01-01'),
        isCurrent: true, // Conflict!
      };

      // BUG: Currently this is ACCEPTED!
      await expect(
        service.addToResume('resume-123', 'user-123', invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT endDate before startDate', async () => {
      const invalidDto = {
        institution: 'MIT',
        degree: 'BS',
        field: 'Computer Science',
        startDate: new Date('2021-01-01'), // Later
        endDate: new Date('2020-01-01'), // Earlier!
        isCurrent: false,
      };

      // BUG: Currently this is ACCEPTED!
      await expect(
        service.addToResume('resume-123', 'user-123', invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REQUIRE endDate when isCurrent=false', async () => {
      const invalidDto = {
        institution: 'MIT',
        degree: 'BS',
        field: 'Computer Science',
        startDate: new Date('2020-01-01'),
        endDate: null, // Missing!
        isCurrent: false, // Not current, so endDate required
      };

      // BUG: Currently this might be ACCEPTED!
      await expect(
        service.addToResume('resume-123', 'user-123', invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('BUG-052: Order Not Validated', () => {
    /**
     * Like Experience, Education has order field.
     * But no uniqueness validation!
     */
    it('should REJECT duplicate order values', async () => {
      mockPrisma.education.findMany.mockResolvedValue([
        { id: 'edu-1', order: 0 },
        { id: 'edu-2', order: 1 },
      ]);

      const duplicateOrderDto = {
        institution: 'MIT',
        degree: 'BS',
        field: 'CS',
        startDate: new Date('2020-01-01'),
        order: 0, // Already exists!
      };

      // BUG: Currently this is ACCEPTED!
      await expect(
        service.addToResume('resume-123', 'user-123', duplicateOrderDto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
