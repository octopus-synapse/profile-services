/**
 * OpenSourceService Tests
 *
 * NOTA (Uncle Bob): OpenSourceService estende BaseSubResourceService.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createMockResume } from '@test/factories/resume.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { OpenSourceService } from './open-source.service';
import { OpenSourceRepository } from '../repositories/open-source.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import { EventPublisher } from '@/shared-kernel';

describe('OpenSourceService', () => {
  let service: OpenSourceService;

  const mockOpenSourceRepository = {
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

  const mockEventPublisher = {
    publish: mock(),
    publishAsync: mock(() => Promise.resolve()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenSourceService,
        { provide: OpenSourceRepository, useValue: mockOpenSourceRepository },
        { provide: ResumesRepository, useValue: mockResumesRepository },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<OpenSourceService>(OpenSourceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct entity name', () => {
    expect((service as any).entityName).toBe('Open source contribution');
  });

  it('should have a logger instance', () => {
    expect((service as any).logger).toBeInstanceOf(Logger);
  });

  describe('CRUD operations', () => {
    const mockResume = createMockResume({ id: 'resume-1', userId: 'user-1' });
    const mockOpenSource = {
      id: 'oss-1',
      resumeId: 'resume-1',
      project: 'React',
      role: 'Contributor',
      description: 'Fixed bugs and improved docs',
      url: 'https://github.com/facebook/react',
      order: 0,
    };

    beforeEach(() => {
      mockResumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume,
      );
      mockOpenSourceRepository.findAllEntitiesForResume.mockResolvedValue({
        data: [mockOpenSource],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockOpenSourceRepository.createEntityForResume.mockResolvedValue(
        mockOpenSource,
      );
      mockOpenSourceRepository.deleteEntityForResume.mockResolvedValue(true);
    });

    it('should list open source contributions for resume', async () => {
      const result = await service.listAllEntitiesForResume(
        'resume-1',
        'user-1',
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        project: 'React',
        role: 'Contributor',
      });
    });

    it('should add open source contribution to resume', async () => {
      const createDto = {
        projectName: 'NestJS',
        projectUrl: 'https://github.com/nestjs/nest',
        role: 'maintainer',
        description: 'Core team member',
        startDate: '2023-01-01',
      };

      const result = await service.addEntityToResume(
        'resume-1',
        'user-1',
        createDto,
      );

      expect(result.success).toBe(true);
    });

    it('should delete open source contribution', async () => {
      const result = await service.deleteEntityByIdForResume(
        'resume-1',
        'oss-1',
        'user-1',
      );

      expect(result.success).toBe(true);
    });
  });
});
