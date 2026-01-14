/**
 * Resume Search Service Tests
 *
 * TDD tests for full-text search functionality.
 *
 * Kent Beck: "Tests describe behavior, not implementation"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeSearchService } from './resume-search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ResumeSearchService', () => {
  let service: ResumeSearchService;
  let mockPrismaService: {
    $queryRaw: ReturnType<typeof mock>;
    resume: {
      findUnique: ReturnType<typeof mock>;
    };
    skill: {
      findMany: ReturnType<typeof mock>;
    };
  };

  const mockSearchResults = [
    {
      id: 'resume-1',
      userId: 'user-1',
      fullName: 'John Doe',
      jobTitle: 'Senior React Developer',
      summary: 'Experienced developer with React and TypeScript',
      slug: 'john-doe',
      location: 'São Paulo',
      profileViews: 100,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'resume-2',
      userId: 'user-2',
      fullName: 'Jane Smith',
      jobTitle: 'Full Stack Developer',
      summary: 'React and Node.js expert',
      slug: 'jane-smith',
      location: 'Rio de Janeiro',
      profileViews: 50,
      createdAt: new Date('2024-02-01'),
    },
  ];

  const mockResumeWithSkills = {
    id: 'resume-1',
    skills: [
      { id: 'skill-1', name: 'React' },
      { id: 'skill-2', name: 'TypeScript' },
    ],
  };

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: mock(() => Promise.resolve(mockSearchResults)),
      resume: {
        findUnique: mock(() => Promise.resolve(mockResumeWithSkills)),
      },
      skill: {
        findMany: mock(() =>
          Promise.resolve([{ resumeId: 'resume-1' }, { resumeId: 'resume-2' }]),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeSearchService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ResumeSearchService>(ResumeSearchService);
  });

  describe('search', () => {
    it('should search public resumes by query', async () => {
      // Mock returns: first call = search results, second call = count
      let callCount = 0;
      mockPrismaService.$queryRaw = mock(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockSearchResults);
        return Promise.resolve([{ count: 2 }]);
      });

      const result = await service.search({ query: 'react developer' });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by skills', async () => {
      let callCount = 0;
      mockPrismaService.$queryRaw = mock(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockSearchResults);
        return Promise.resolve([{ count: 2 }]);
      });

      const result = await service.search({
        query: 'developer',
        skills: ['typescript', 'react'],
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.skill.findMany).toHaveBeenCalled();
    });

    it('should filter by location', async () => {
      const result = await service.search({
        query: 'developer',
        location: 'São Paulo',
      });

      expect(result).toBeDefined();
    });

    it('should filter by experience years', async () => {
      const result = await service.search({
        query: 'developer',
        minExperienceYears: 3,
        maxExperienceYears: 10,
      });

      expect(result).toBeDefined();
    });

    it('should support pagination', async () => {
      const result = await service.search({
        query: 'developer',
        page: 2,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should support sorting', async () => {
      const result = await service.search({
        query: 'developer',
        sortBy: 'relevance',
      });

      expect(result).toBeDefined();
    });

    it('should return empty result for no matches', async () => {
      let callCount = 0;
      mockPrismaService.$queryRaw = mock(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([]); // empty results
        return Promise.resolve([{ count: 0 }]); // count = 0
      });

      const result = await service.search({ query: 'xyz123nonexistent' });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('suggest', () => {
    it('should return search suggestions', async () => {
      mockPrismaService.$queryRaw = mock(() =>
        Promise.resolve([
          { suggestion: 'react developer' },
          { suggestion: 'react native' },
        ]),
      );

      const result = await service.suggest('react');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should limit suggestions', async () => {
      await service.suggest('dev', 5);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('findSimilar', () => {
    it('should find similar resumes based on skills', async () => {
      mockPrismaService.$queryRaw = mock(() =>
        Promise.resolve([mockSearchResults[1]]),
      );

      const result = await service.findSimilar('resume-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should exclude the source resume', async () => {
      mockPrismaService.$queryRaw = mock(() =>
        Promise.resolve([mockSearchResults[1]]),
      );

      const result = await service.findSimilar('resume-1');

      const hasSourceResume = result.some((r: any) => r.id === 'resume-1');
      expect(hasSourceResume).toBe(false);
    });

    it('should return empty array when resume not found', async () => {
      mockPrismaService.resume.findUnique = mock(() => Promise.resolve(null));

      const result = await service.findSimilar('nonexistent-id');

      expect(result).toEqual([]);
    });
  });
});
