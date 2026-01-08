/**
 * InterestService Tests
 *
 * NOTA (Uncle Bob): InterestService estende BaseSubResourceService.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { InterestService } from './interest.service';
import { InterestRepository } from '../repositories/interest.repository';
import { ResumesRepository } from '../resumes.repository';

describe('InterestService', () => {
  let service: InterestService;

  const mockInterestRepository = {
    findAll: mock(),
    findOne: mock(),
    create: mock(),
    update: mock(),
    delete: mock(),
    reorder: mock(),
  };

  const mockResumesRepository = {
    findOne: mock(),
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
    const mockResume = { id: 'resume-1', userId: 'user-1' };
    const mockInterest = {
      id: 'interest-1',
      resumeId: 'resume-1',
      name: 'Open Source',
      description: 'Contributing to OSS projects',
      order: 0,
    };

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockInterestRepository.findAll.mockResolvedValue({
        data: [mockInterest],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockInterestRepository.create.mockResolvedValue(mockInterest);
      mockInterestRepository.delete.mockResolvedValue(true);
    });

    it('should list interests for resume', async () => {
      const result = await service.listForResume('resume-1', 'user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Open Source');
    });

    it('should add interest to resume', async () => {
      const createDto = { name: 'Machine Learning' };

      const result = await service.addToResume('resume-1', 'user-1', createDto);

      expect(result.success).toBe(true);
    });

    it('should delete interest', async () => {
      const result = await service.deleteById(
        'resume-1',
        'interest-1',
        'user-1',
      );

      expect(result.success).toBe(true);
    });
  });
});
