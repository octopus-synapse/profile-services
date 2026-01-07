/**
 * BugBountyService Tests
 *
 * NOTA (Uncle Bob): BugBountyService estende BaseSubResourceService.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { BugBountyService } from './bug-bounty.service';
import { BugBountyRepository } from '../repositories/bug-bounty.repository';
import { ResumesRepository } from '../resumes.repository';

describe('BugBountyService', () => {
  let service: BugBountyService;

  const mockBugBountyRepository = {
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
        BugBountyService,
        { provide: BugBountyRepository, useValue: mockBugBountyRepository },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get<BugBountyService>(BugBountyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct entity name', () => {
    expect((service as any).entityName).toBe('Bug bounty');
  });

  it('should have a logger instance', () => {
    expect((service as any).logger).toBeInstanceOf(Logger);
  });

  describe('CRUD operations', () => {
    const mockResume = { id: 'resume-1', userId: 'user-1' };
    const mockBugBounty = {
      id: 'bb-1',
      resumeId: 'resume-1',
      platform: 'HackerOne',
      company: 'Google',
      severity: 'HIGH',
      reward: 5000,
      description: 'XSS vulnerability in search',
      order: 0,
    };

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockBugBountyRepository.findAll.mockResolvedValue({
        data: [mockBugBounty],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockBugBountyRepository.create.mockResolvedValue(mockBugBounty);
      mockBugBountyRepository.delete.mockResolvedValue(true);
    });

    it('should list bug bounties for resume', async () => {
      const result = await service.listForResume('resume-1', 'user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        platform: 'HackerOne',
        severity: 'HIGH',
      });
    });

    it('should add bug bounty to resume', async () => {
      const createDto = {
        platform: 'Bugcrowd',
        company: 'Meta',
        severity: 'critical',
        vulnerabilityType: 'Auth Bypass',
        reportedAt: '2024-01-15',
      };

      const result = await service.addToResume('resume-1', 'user-1', createDto);

      expect(result.success).toBe(true);
    });

    it('should delete bug bounty', async () => {
      const result = await service.deleteById('resume-1', 'bb-1', 'user-1');

      expect(result.success).toBe(true);
    });
  });
});
