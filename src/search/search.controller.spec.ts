/**
 * Search Controller Tests
 *
 * TDD tests for search REST endpoints.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { ResumeSearchService } from './resume-search.service';

describe('SearchController', () => {
  let controller: SearchController;
  let mockSearchService: {
    search: ReturnType<typeof mock>;
    suggest: ReturnType<typeof mock>;
    findSimilar: ReturnType<typeof mock>;
  };

  const mockSearchResult = {
    data: [
      {
        id: 'resume-1',
        userId: 'user-1',
        fullName: 'John Doe',
        jobTitle: 'Senior Developer',
        summary: 'Experienced developer',
        slug: 'john-doe',
        location: 'São Paulo',
        profileViews: 100,
        createdAt: new Date(),
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    mockSearchService = {
      search: mock(() => Promise.resolve(mockSearchResult)),
      suggest: mock(() => Promise.resolve(['developer', 'designer'])),
      findSimilar: mock(() =>
        Promise.resolve([
          { id: 'resume-2', fullName: 'Jane Smith', jobTitle: 'Developer' },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: ResumeSearchService, useValue: mockSearchService },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  describe('search', () => {
    it('should search resumes with query', async () => {
      const result = await controller.search('developer');

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(mockSearchService.search).toHaveBeenCalled();
    });

    it('should parse skills from comma-separated string', async () => {
      await controller.search('developer', 'react,typescript');

      expect(mockSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: ['react', 'typescript'],
        }),
      );
    });

    it('should parse pagination params', async () => {
      await controller.search('developer', undefined, undefined, undefined, undefined, '2', '10');

      expect(mockSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
        }),
      );
    });
  });

  describe('suggestions', () => {
    it('should return suggestions for prefix', async () => {
      const result = await controller.suggestions('dev');

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(mockSearchService.suggest).toHaveBeenCalledWith('dev', 10);
    });

    it('should respect limit parameter', async () => {
      await controller.suggestions('dev', '5');

      expect(mockSearchService.suggest).toHaveBeenCalledWith('dev', 5);
    });
  });

  describe('similar', () => {
    it('should find similar resumes', async () => {
      const result = await controller.similar('resume-1');

      expect(result).toBeDefined();
      expect(result.resumes).toBeDefined();
      expect(mockSearchService.findSimilar).toHaveBeenCalledWith('resume-1', 5);
    });

    it('should respect limit parameter', async () => {
      await controller.similar('resume-1', '10');

      expect(mockSearchService.findSimilar).toHaveBeenCalledWith('resume-1', 10);
    });
  });
});
