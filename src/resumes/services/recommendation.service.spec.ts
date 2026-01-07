/**
 * RecommendationService Tests
 *
 * NOTA (Uncle Bob): RecommendationService estende BaseSubResourceService.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { ResumesRepository } from '../resumes.repository';

describe('RecommendationService', () => {
  let service: RecommendationService;

  const mockRecommendationRepository = {
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
        RecommendationService,
        {
          provide: RecommendationRepository,
          useValue: mockRecommendationRepository,
        },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct entity name', () => {
    expect((service as any).entityName).toBe('Recommendation');
  });

  it('should have a logger instance', () => {
    expect((service as any).logger).toBeInstanceOf(Logger);
  });

  describe('CRUD operations', () => {
    const mockResume = { id: 'resume-1', userId: 'user-1' };
    const mockRecommendation = {
      id: 'rec-1',
      resumeId: 'resume-1',
      recommenderName: 'John Manager',
      recommenderTitle: 'Engineering Manager',
      content: 'Excellent developer with great communication skills.',
      order: 0,
    };

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockRecommendationRepository.findAll.mockResolvedValue({
        data: [mockRecommendation],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockRecommendationRepository.create.mockResolvedValue(mockRecommendation);
      mockRecommendationRepository.delete.mockResolvedValue(true);
    });

    it('should list recommendations for resume', async () => {
      const result = await service.listForResume('resume-1', 'user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        recommenderName: 'John Manager',
        content: expect.stringContaining('Excellent'),
      });
    });

    it('should add recommendation to resume', async () => {
      const createDto = {
        author: 'Jane CTO',
        position: 'CTO',
        content: 'Highly recommended.',
      };

      const result = await service.addToResume('resume-1', 'user-1', createDto);

      expect(result.success).toBe(true);
    });

    it('should delete recommendation', async () => {
      const result = await service.deleteById('resume-1', 'rec-1', 'user-1');

      expect(result.success).toBe(true);
    });
  });
});
