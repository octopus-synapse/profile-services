/**
 * Experience Service Bug Detection Tests
 *
 * These tests are written from SPECIFICATIONS, not from implementation.
 * Uncle Bob: "Your tests should be specifications in executable form."
 *
 * EXPECTED: Some tests will FAIL - that's the point. They expose bugs.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ExperienceService } from './experience.service';
import { ExperienceRepository } from '../repositories/experience.repository';
import { ResumesRepository } from '../resumes.repository';

describe('ExperienceService - Bug Detection', () => {
  let service: ExperienceService;
  let mockExperienceRepo: ExperienceRepository;
  let mockResumesRepo: ResumesRepository;

  const mockResume = { id: 'resume-123', userId: 'user-123' };
  const mockExperience = {
    id: 'exp-1',
    resumeId: 'resume-123',
    company: 'Acme',
    position: 'Developer',
    startDate: new Date('2020-01-01'),
    endDate: null,
    isCurrent: true,
    order: 0,
  };

  beforeEach(async () => {
    mockExperienceRepo = {
      findAll: mock().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
      findOne: mock().mockResolvedValue(mockExperience),
      create: mock().mockResolvedValue(mockExperience),
      update: mock().mockResolvedValue(mockExperience),
      delete: mock().mockResolvedValue(true),
      reorder: mock().mockResolvedValue(undefined),
    } as any;

    mockResumesRepo = {
      findOne: mock().mockResolvedValue(mockResume),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperienceService,
        { provide: ExperienceRepository, useValue: mockExperienceRepo },
        { provide: ResumesRepository, useValue: mockResumesRepo },
      ],
    }).compile();

    service = module.get<ExperienceService>(ExperienceService);
  });

  /**
   * BUG #4: isCurrent and endDate validation
   *
   * Business Rule: "If isCurrent = true → endDate must be null.
   *                 Any other combination is invalid and must generate error.
   *                 Frontend can display 'Present' or current date, but this is just UI."
   *
   * Current behavior: No validation
   * Expected behavior: Throw BadRequestException for invalid combinations
   */
  describe('BUG #4: isCurrent and endDate validation', () => {
    it('should REJECT isCurrent=true with endDate set', async () => {
      const invalidDto = {
        company: 'Acme Corp',
        position: 'Software Engineer',
        startDate: '2020-01-01',
        endDate: '2023-06-01', // BUG: endDate with isCurrent=true
        isCurrent: true,
      };

      await expect(
        service.addToResume('resume-123', 'user-123', invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT isCurrent=false with endDate=null (ambiguous)', async () => {
      // If not current, must have an end date
      const invalidDto = {
        company: 'Acme Corp',
        position: 'Software Engineer',
        startDate: '2020-01-01',
        endDate: null, // BUG: no endDate but not current
        isCurrent: false,
      };

      await expect(
        service.addToResume('resume-123', 'user-123', invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ACCEPT isCurrent=true with endDate=null', async () => {
      const validDto = {
        company: 'Acme Corp',
        position: 'Software Engineer',
        startDate: '2020-01-01',
        endDate: null,
        isCurrent: true,
      };

      const result = await service.addToResume(
        'resume-123',
        'user-123',
        validDto as any,
      );
      expect(result.success).toBe(true);
    });

    it('should ACCEPT isCurrent=false with valid endDate', async () => {
      const validDto = {
        company: 'Acme Corp',
        position: 'Software Engineer',
        startDate: '2020-01-01',
        endDate: '2023-06-01',
        isCurrent: false,
      };

      const result = await service.addToResume(
        'resume-123',
        'user-123',
        validDto as any,
      );
      expect(result.success).toBe(true);
    });

    it('should include "isCurrent" or "endDate" in error message', async () => {
      const invalidDto = {
        company: 'Acme',
        position: 'Dev',
        startDate: '2020-01-01',
        endDate: '2023-01-01',
        isCurrent: true,
      };

      try {
        await service.addToResume('resume-123', 'user-123', invalidDto as any);
        fail('Should have thrown');
      } catch (error) {
        const msg = (error as Error).message.toLowerCase();
        expect(msg).toMatch(/current|end.?date|invalid/);
      }
    });
  });

  /**
   * Date validation
   *
   * Business Rules:
   * - startDate must be before endDate
   * - startDate cannot be in the future (unless explicitly allowed)
   * - endDate cannot be before startDate
   */
  describe('Date range validation', () => {
    it('should REJECT endDate before startDate', async () => {
      const invalidDto = {
        company: 'Acme',
        position: 'Dev',
        startDate: '2023-01-01',
        endDate: '2020-01-01', // Before start date!
        isCurrent: false,
      };

      await expect(
        service.addToResume('resume-123', 'user-123', invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT same startDate and endDate', async () => {
      const invalidDto = {
        company: 'Acme',
        position: 'Dev',
        startDate: '2023-01-01',
        endDate: '2023-01-01', // Same day - likely an error
        isCurrent: false,
      };

      await expect(
        service.addToResume('resume-123', 'user-123', invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /**
   * Order uniqueness validation
   *
   * Business Rule: "Two items cannot have the same order.
   *                 If it happens: operation fails, no automatic tiebreaker."
   */
  describe('Order uniqueness validation', () => {
    it('should REJECT creating experience with duplicate order', async () => {
      // Existing experience at order 0
      mockExperienceRepo.findAll.mockResolvedValue({
        data: [{ ...mockExperience, order: 0 }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      } as any);

      const duplicateOrderDto = {
        company: 'New Company',
        position: 'New Role',
        startDate: '2023-01-01',
        order: 0, // Duplicate order!
      };

      await expect(
        service.addToResume('resume-123', 'user-123', duplicateOrderDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ACCEPT experience with unique order', async () => {
      mockExperienceRepo.findAll.mockResolvedValue({
        data: [{ ...mockExperience, order: 0 }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      } as any);

      const uniqueOrderDto = {
        company: 'New Company',
        position: 'New Role',
        startDate: '2023-01-01',
        order: 1, // Unique order
      };

      const result = await service.addToResume(
        'resume-123',
        'user-123',
        uniqueOrderDto as any,
      );
      expect(result.success).toBe(true);
    });
  });
});
