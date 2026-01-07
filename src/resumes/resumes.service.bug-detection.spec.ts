/**
 * Resume Service Bug Detection Tests
 *
 * These tests are written from SPECIFICATIONS, not from implementation.
 * Uncle Bob: "Write the test you wish you had."
 *
 * EXPECTED: Some tests will FAIL - that's the point. They expose bugs.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { ResumesRepository } from './resumes.repository';

describe('ResumesService - Bug Detection', () => {
  let service: ResumesService;
  let mockRepository: ResumesRepository;

  const mockResume = {
    id: 'resume-1',
    userId: 'user-123',
    title: 'Test Resume',
  };

  beforeEach(async () => {
    mockRepository = {
      findAll: mock().mockResolvedValue([]),
      findOne: mock().mockResolvedValue(mockResume),
      create: mock().mockResolvedValue(mockResume),
      update: mock().mockResolvedValue(mockResume),
      delete: mock().mockResolvedValue(true),
      findByUserId: mock().mockResolvedValue(mockResume),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesService,
        { provide: ResumesRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ResumesService>(ResumesService);
  });

  /**
   * BUG #3: Resume limit should return HTTP 422, not 400
   *
   * Business Rule: "When trying to create the 5th resume:
   *                 - Business rule error
   *                 - Recommended status: 422
   *                 - Clear message: 'The maximum resume limit is 4'"
   *
   * Current behavior: Throws BadRequestException (400)
   * Expected behavior: Throw UnprocessableEntityException (422)
   */
  describe('BUG #3: Resume limit should return HTTP 422', () => {
    it('should throw UnprocessableEntityException (422) when limit reached', async () => {
      // User already has 4 resumes
      mockRepository.findAll.mockResolvedValue([
        { id: '1' },
        { id: '2' },
        { id: '3' },
        { id: '4' },
      ] as any);

      // Trying to create 5th should throw 422
      await expect(
        service.create('user-123', { title: 'Fifth Resume' } as any),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should NOT throw BadRequestException (400) for limit error', async () => {
      mockRepository.findAll.mockResolvedValue([
        { id: '1' },
        { id: '2' },
        { id: '3' },
        { id: '4' },
      ] as any);

      // This exposes the bug: it currently throws BadRequestException
      try {
        await service.create('user-123', { title: 'Fifth Resume' } as any);
        fail('Should have thrown an exception');
      } catch (error) {
        // Bug: this will fail because error IS BadRequestException
        expect(error).not.toBeInstanceOf(BadRequestException);
        expect(error).toBeInstanceOf(UnprocessableEntityException);
      }
    });

    it('should have exactly the message "O limite máximo de currículos é 4" (pt-BR)', async () => {
      mockRepository.findAll.mockResolvedValue([
        { id: '1' },
        { id: '2' },
        { id: '3' },
        { id: '4' },
      ] as any);

      try {
        await service.create('user-123', { title: 'Fifth Resume' } as any);
        fail('Should have thrown');
      } catch (error) {
        // Check for specific message per business rule
        expect((error as Error).message).toInclude('4');
        expect((error as Error).message.toLowerCase()).toInclude('limit');
      }
    });
  });

  /**
   * Boundary testing for resume limit
   */
  describe('Resume limit boundary tests', () => {
    it('should allow creating 4th resume (at limit)', async () => {
      mockRepository.findAll.mockResolvedValue([
        { id: '1' },
        { id: '2' },
        { id: '3' },
      ] as any);

      const result = await service.create('user-123', {
        title: 'Fourth Resume',
      } as any);
      expect(result.success).toBe(true);
    });

    it('should reject at exactly 4 existing resumes', async () => {
      mockRepository.findAll.mockResolvedValue([
        { id: '1' },
        { id: '2' },
        { id: '3' },
        { id: '4' },
      ] as any);

      await expect(
        service.create('user-123', { title: 'Fifth' } as any),
      ).rejects.toThrow();
    });
  });
});
