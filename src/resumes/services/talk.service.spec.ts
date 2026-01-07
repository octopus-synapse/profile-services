/**
 * TalkService Tests
 *
 * NOTA (Uncle Bob): TalkService estende BaseSubResourceService.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { TalkService } from './talk.service';
import { TalkRepository } from '../repositories/talk.repository';
import { ResumesRepository } from '../resumes.repository';

describe('TalkService', () => {
  let service: TalkService;

  const mockTalkRepository = {
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
        TalkService,
        { provide: TalkRepository, useValue: mockTalkRepository },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get<TalkService>(TalkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct entity name', () => {
    expect((service as any).entityName).toBe('Talk');
  });

  it('should have a logger instance', () => {
    expect((service as any).logger).toBeInstanceOf(Logger);
  });

  describe('CRUD operations', () => {
    const mockResume = { id: 'resume-1', userId: 'user-1' };
    const mockTalk = {
      id: 'talk-1',
      resumeId: 'resume-1',
      title: 'Building Scalable Systems',
      event: 'Tech Conference 2023',
      date: new Date('2023-06-15'),
      order: 0,
    };

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockTalkRepository.findAll.mockResolvedValue({
        data: [mockTalk],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockTalkRepository.create.mockResolvedValue(mockTalk);
      mockTalkRepository.delete.mockResolvedValue(true);
    });

    it('should list talks for resume', async () => {
      const result = await service.listForResume('resume-1', 'user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        title: 'Building Scalable Systems',
        event: 'Tech Conference 2023',
      });
    });

    it('should add talk to resume', async () => {
      const createDto = {
        title: 'Microservices Best Practices',
        event: 'DevOps Summit',
        eventType: 'conference',
        date: '2024-01-20',
      };

      const result = await service.addToResume('resume-1', 'user-1', createDto);

      expect(result.success).toBe(true);
    });

    it('should delete talk', async () => {
      const result = await service.deleteById('resume-1', 'talk-1', 'user-1');

      expect(result.success).toBe(true);
    });
  });
});
