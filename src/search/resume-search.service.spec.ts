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
import { ResumeSearchRepository } from './repositories';

describe('ResumeSearchService', () => {
  let service: ResumeSearchService;
  let mockRepository: {
    executeSearch: ReturnType<typeof mock>;
    findResumeWithSkills: ReturnType<typeof mock>;
    getSuggestions: ReturnType<typeof mock>;
    findSimilarResumes: ReturnType<typeof mock>;
    findSkillsByResumeIds: ReturnType<typeof mock>;
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
    mockRepository = {
      executeSearch: mock(() =>
        Promise.resolve({ results: mockSearchResults, total: 2 }),
      ),
      findResumeWithSkills: mock(() => Promise.resolve(mockResumeWithSkills)),
      getSuggestions: mock(() => Promise.resolve([])),
      findSimilarResumes: mock(() => Promise.resolve([mockSearchResults[1]])),
      findSkillsByResumeIds: mock(() =>
        Promise.resolve([
          { resumeId: 'resume-1', name: 'TypeScript' },
          { resumeId: 'resume-2', name: 'React' },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeSearchService,
        { provide: ResumeSearchRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ResumeSearchService>(ResumeSearchService);
  });

  describe('search', () => {
    it('should search public resumes by query', async () => {
      mockRepository.executeSearch.mockResolvedValue({
        results: mockSearchResults,
        total: 2,
      });

      const result = await service.search({ query: 'react developer' });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by skills', async () => {
      mockRepository.executeSearch.mockResolvedValue({
        results: mockSearchResults,
        total: 2,
      });

      const result = await service.search({
        query: 'developer',
        skills: ['typescript', 'react'],
      });

      expect(result).toBeDefined();
      expect(mockRepository.executeSearch).toHaveBeenCalled();
    });

    it('should filter by location', async () => {
      mockRepository.executeSearch.mockResolvedValue({
        results: mockSearchResults,
        total: 2,
      });

      const result = await service.search({
        query: 'developer',
        location: 'São Paulo',
      });

      expect(result).toBeDefined();
    });

    it('should filter by experience years', async () => {
      mockRepository.executeSearch.mockResolvedValue({
        results: mockSearchResults,
        total: 2,
      });

      const result = await service.search({
        query: 'developer',
        minExperienceYears: 3,
        maxExperienceYears: 10,
      });

      expect(result).toBeDefined();
    });

    it('should support pagination', async () => {
      mockRepository.executeSearch.mockResolvedValue({
        results: mockSearchResults,
        total: 2,
      });

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
      mockRepository.executeSearch.mockResolvedValue({
        results: mockSearchResults,
        total: 2,
      });

      const result = await service.search({
        query: 'developer',
        sortBy: 'relevance',
      });

      expect(result).toBeDefined();
    });

    it('should return empty result for no matches', async () => {
      mockRepository.executeSearch.mockResolvedValue({
        results: [],
        total: 0,
      });

      const result = await service.search({ query: 'xyz123nonexistent' });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('suggest', () => {
    it('should return search suggestions', async () => {
      mockRepository.getSuggestions.mockResolvedValue([
        { suggestion: 'react developer' },
        { suggestion: 'react native' },
      ]);

      const result = await service.suggest('react');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should limit suggestions', async () => {
      mockRepository.getSuggestions.mockResolvedValue([]);

      await service.suggest('dev', 5);

      expect(mockRepository.getSuggestions).toHaveBeenCalled();
    });
  });

  describe('findSimilar', () => {
    it('should find similar resumes based on skills', async () => {
      mockRepository.findResumeWithSkills.mockResolvedValue(
        mockResumeWithSkills,
      );
      mockRepository.executeSearch.mockResolvedValue({
        results: [mockSearchResults[1]],
        total: 1,
      });

      const result = await service.findSimilar('resume-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should exclude the source resume', async () => {
      mockRepository.findResumeWithSkills.mockResolvedValue(
        mockResumeWithSkills,
      );
      mockRepository.executeSearch.mockResolvedValue({
        results: [mockSearchResults[1]],
        total: 1,
      });

      const result = await service.findSimilar('resume-1');

      const hasSourceResume = result.some((r: any) => r.id === 'resume-1');
      expect(hasSourceResume).toBe(false);
    });

    it('should return empty array when resume not found', async () => {
      mockRepository.findResumeWithSkills.mockResolvedValue(null);

      const result = await service.findSimilar('nonexistent-id');

      expect(result).toEqual([]);
    });
  });
});
