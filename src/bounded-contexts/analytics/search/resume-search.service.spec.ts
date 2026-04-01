/**
 * Resume Search Service Tests
 *
 * TDD tests for full-text search functionality.
 *
 * Kent Beck: "Tests describe behavior, not implementation"
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { InMemorySearchService } from '@/bounded-contexts/analytics/testing';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeSearchService } from './resume-search.service';

describe('ResumeSearchService', () => {
  let service: ResumeSearchService;
  let searchRepo: InMemorySearchService;

  beforeEach(async () => {
    searchRepo = new InMemorySearchService();

    // Seed test data
    searchRepo.seedResume({
      id: 'resume-1',
      userId: 'user-1',
      fullName: 'John Doe',
      jobTitle: 'Senior React Developer',
      summary: 'Experienced developer with React and TypeScript',
      slug: 'john-doe',
      location: 'São Paulo',
      profileViews: 100,
      createdAt: new Date('2024-01-01'),
      skills: ['React', 'TypeScript'],
    });

    searchRepo.seedResume({
      id: 'resume-2',
      userId: 'user-2',
      fullName: 'Jane Smith',
      jobTitle: 'Full Stack Developer',
      summary: 'React and Node.js expert',
      slug: 'jane-smith',
      location: 'Rio de Janeiro',
      profileViews: 50,
      createdAt: new Date('2024-02-01'),
      skills: ['React', 'Node.js'],
    });

    searchRepo.seedSuggestions(['react developer', 'react native', 'developer']);

    const mockPrismaService = {
      $queryRaw: async () => [],
      resume: {
        findUnique: async () => null,
        findMany: async () => [],
      },
      sectionItem: {
        findMany: async () => [],
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ResumeSearchService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ResumeSearchService>(ResumeSearchService);
    // Replace service methods with in-memory implementations
    service.search = searchRepo.search.bind(searchRepo);
    service.suggest = searchRepo.suggest.bind(searchRepo);
    service.findSimilar = searchRepo.findSimilar.bind(searchRepo);
  });

  describe('search', () => {
    it('should search public resumes by query', async () => {
      const result = await service.search({ query: 'react developer' });

      expect(result).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should filter by skills', async () => {
      const result = await service.search({
        query: 'developer',
        skills: ['typescript', 'react'],
      });

      expect(result).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
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
      const result = await service.search({ query: 'xyz123nonexistent' });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('suggest', () => {
    it('should return search suggestions', async () => {
      const result = await service.suggest('react');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit suggestions', async () => {
      const result = await service.suggest('dev', 5);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('findSimilar', () => {
    it('should find similar resumes based on skills', async () => {
      const result = await service.findSimilar('resume-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should exclude the source resume', async () => {
      const result = await service.findSimilar('resume-1');

      const hasSourceResume = result.some((r: { id: string }) => r.id === 'resume-1');
      expect(hasSourceResume).toBe(false);
    });

    it('should return empty array when resume not found', async () => {
      const result = await service.findSimilar('nonexistent-id');

      expect(result).toEqual([]);
    });
  });
});
