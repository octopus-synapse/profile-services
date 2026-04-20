/**
 * Search Controller Tests
 *
 * Pure tests using in-memory implementations (no mocks).
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { SearchController } from './search.controller';
import { InMemorySearchService } from './testing';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: InMemorySearchService;

  beforeEach(() => {
    searchService = new InMemorySearchService();
    controller = new SearchController(searchService);

    // Seed test data
    searchService.seedResume({
      id: 'resume-1',
      userId: 'user-1',
      fullName: 'John Doe',
      jobTitle: 'Senior Developer',
      summary: 'Experienced developer',
      slug: 'john-doe',
      location: 'São Paulo',
      profileViews: 100,
      skills: ['TypeScript', 'React'],
    });

    searchService.seedResume({
      id: 'resume-2',
      userId: 'user-2',
      fullName: 'Jane Smith',
      jobTitle: 'Developer',
      summary: 'Junior developer',
      slug: 'jane-smith',
      location: 'Rio de Janeiro',
      profileViews: 50,
      skills: ['JavaScript', 'React'],
    });

    searchService.seedSuggestions(['developer', 'designer', 'devops']);
  });

  describe('search', () => {
    it('should search resumes with query', async () => {
      const result = await controller.search({ q: 'developer', page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data?.data.length).toBeGreaterThan(0);
    });

    it('should parse skills from comma-separated string', async () => {
      const result = await controller.search({
        q: '',
        skills: 'react,typescript',
        page: 1,
        limit: 20,
      });

      expect(result.data?.data).toHaveLength(2); // Both have React
    });

    it('should parse pagination params', async () => {
      const result = await controller.search({ q: '', page: 1, limit: 1 });

      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(1);
      expect(result.data?.data).toHaveLength(1);
    });

    it('should filter by location', async () => {
      const result = await controller.search({ q: '', location: 'São Paulo', page: 1, limit: 20 });

      expect(result.data?.data).toHaveLength(1);
      expect(result.data?.data[0].fullName).toBe('John Doe');
    });
  });

  describe('suggestions', () => {
    it('should return suggestions for prefix', async () => {
      const result = await controller.suggestions({ prefix: 'dev', limit: 10 });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data?.suggestions).toContain('developer');
      expect(result.data?.suggestions).toContain('devops');
    });

    it('should respect limit parameter', async () => {
      const result = await controller.suggestions({ prefix: 'dev', limit: 1 });

      expect(result.data?.suggestions).toHaveLength(1);
    });
  });

  describe('similar', () => {
    it('should find similar resumes', async () => {
      const result = await controller.similar('resume-1', { limit: 5 });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      // resume-2 shares 'React' with resume-1
      expect(result.data?.resumes.some((r) => r.id === 'resume-2')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      // Add more resumes with shared skills
      searchService.seedResume({
        id: 'resume-3',
        fullName: 'Bob',
        skills: ['TypeScript', 'React', 'Node.js'],
      });

      const result = await controller.similar('resume-1', { limit: 1 });

      expect(result.data?.resumes).toHaveLength(1);
    });
  });
});
