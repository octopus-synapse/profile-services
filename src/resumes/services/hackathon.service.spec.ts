/**
 * HackathonService Tests
 *
 * NOTA (Uncle Bob): HackathonService estende BaseSubResourceService.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { HackathonService } from './hackathon.service';
import { HackathonRepository } from '../repositories/hackathon.repository';
import { ResumesRepository } from '../resumes.repository';

describe('HackathonService', () => {
  let service: HackathonService;

  const mockHackathonRepository = {
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
        HackathonService,
        { provide: HackathonRepository, useValue: mockHackathonRepository },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get<HackathonService>(HackathonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct entity name', () => {
    expect((service as any).entityName).toBe('Hackathon');
  });

  it('should have a logger instance', () => {
    expect((service as any).logger).toBeInstanceOf(Logger);
  });

  describe('CRUD operations', () => {
    const mockResume = { id: 'resume-1', userId: 'user-1' };
    const mockHackathon = {
      id: 'hack-1',
      resumeId: 'resume-1',
      name: 'Global Hackathon 2023',
      project: 'AI-powered Resume Builder',
      achievement: '1st Place',
      date: new Date('2023-09-01'),
      order: 0,
    };

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockHackathonRepository.findAll.mockResolvedValue({
        data: [mockHackathon],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockHackathonRepository.create.mockResolvedValue(mockHackathon);
      mockHackathonRepository.delete.mockResolvedValue(true);
    });

    it('should list hackathons for resume', async () => {
      const result = await service.listForResume('resume-1', 'user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        name: 'Global Hackathon 2023',
        achievement: '1st Place',
      });
    });

    it('should add hackathon to resume', async () => {
      const createDto = {
        name: 'Local Hack Day',
        organizer: 'MLH',
        projectName: 'Smart Home Automation',
        position: '2nd Place',
        date: '2024-01-20',
      };

      const result = await service.addToResume('resume-1', 'user-1', createDto);

      expect(result.success).toBe(true);
    });

    it('should delete hackathon', async () => {
      const result = await service.deleteById('resume-1', 'hack-1', 'user-1');

      expect(result.success).toBe(true);
    });
  });
});
