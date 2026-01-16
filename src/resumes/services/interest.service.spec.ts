/**
 * InterestService Tests
 *
 * NOTA (Uncle Bob): InterestService estende BaseSubResourceService.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createMockResume } from '../../../test/factories/resume.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { InterestService } from './interest.service';
import { InterestRepository } from '../repositories/interest.repository';
import { ResumesRepository } from '../resumes.repository';

describe('InterestService', () => {
  let service: InterestService;

  const mockInterestRepository = {
    findAllEntitiesForResume: mock(),
    findResumeByIdAndUserId: mock(),
    createEntityForResume: mock(),
    updateEntityForResume: mock(),
    deleteEntityForResume: mock(),
    reorderEntitiesForResume: mock(),
  };

  const mockResumesRepository = {
    findResumeByIdAndUserId: mock(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterestService,
        { provide: InterestRepository, useValue: mockInterestRepository },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get<InterestService>(InterestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct entity name', () => {
    expect((service as any).entityName).toBe('Interest');
  });

  it('should have a logger instance', () => {
    expect((service as any).logger).toBeInstanceOf(Logger);
  });

  describe('CRUD operations', () => {
    const mockResume = createMockResume({ id: 'resume-1', userId: 'user-1' });
    const mockInterest = {
      id: 'interest-1',
      resumeId: 'resume-1',
      name: 'Open Source',
      description: 'Contributing to OSS projects',
      order: 0,
    };

    beforeEach(() => {
      mockResumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume,
      );
      mockInterestRepository.findAllEntitiesForResume.mockResolvedValue({
        data: [mockInterest],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockInterestRepository.createEntityForResume.mockResolvedValue(
        mockInterest,
      );
      mockInterestRepository.deleteEntityForResume.mockResolvedValue(true);
    });

    it('should list interests for resume', async () => {
      const result = await service.listAllEntitiesForResume(
        'resume-1',
        'user-1',
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Open Source');
    });

    it('should add interest to resume', async () => {
      const createDto = { name: 'Machine Learning' };

      const result = await service.addEntityToResume(
        'resume-1',
        'user-1',
        createDto,
      );

      expect(result.success).toBe(true);
    });

    it('should delete interest', async () => {
      const result = await service.deleteEntityByIdForResume(
        'resume-1',
        'interest-1',
        'user-1',
      );

      expect(result.success).toBe(true);
    });
  });
});
