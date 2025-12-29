/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Section Ordering Service Tests
 * Tests for reordering of sections and items
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SectionOrderingService } from './section-ordering.service';
import {
  ResumeConfigRepository,
  ResumeConfig,
} from './resume-config.repository';
import { BadRequestException } from '@nestjs/common';

// Mock the ordering utils - note: moveItem has a bug where normalizeOrders
// re-sorts by order property, undoing the splice operation
jest.mock('../utils', () => ({
  moveItem: jest.fn((items, fromIdx, toIdx) => {
    const result = [...items];
    const [item] = result.splice(fromIdx, 1);
    result.splice(toIdx, 0, item);
    // Simulate normalizeOrders behavior
    return result.sort((a, b) => a.order - b.order);
  }),
  normalizeOrders: jest.fn((items) =>
    items.map((item: { order: number }, idx: number) => ({
      ...item,
      order: idx,
    })),
  ),
}));

describe('SectionOrderingService', () => {
  let service: SectionOrderingService;
  let repo: {
    get: jest.Mock;
    save: jest.Mock;
  };

  const mockConfig: ResumeConfig = {
    sections: [
      { id: 'header', visible: true, order: 0, column: 'main' },
      { id: 'experience', visible: true, order: 1, column: 'main' },
      { id: 'education', visible: true, order: 2, column: 'main' },
      { id: 'skills', visible: true, order: 3, column: 'sidebar' },
    ],
    itemOverrides: {
      experience: [
        { itemId: 'exp-1', visible: true, order: 0 },
        { itemId: 'exp-2', visible: true, order: 1 },
        { itemId: 'exp-3', visible: true, order: 2 },
      ],
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      get: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectionOrderingService,
        { provide: ResumeConfigRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SectionOrderingService>(SectionOrderingService);
    repo = mockRepo;
  });

  describe('reorderSection', () => {
    it('should reorder a section to a new position', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      const result = await service.reorderSection(
        'user-1',
        'resume-1',
        'experience',
        2,
      );

      expect(result).toEqual({ success: true });
      expect(repo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if section not found', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });

      await expect(
        service.reorderSection('user-1', 'resume-1', 'non-existent', 2),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call moveItem with correct indices', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      const { moveItem } = require('../utils');

      await service.reorderSection('user-1', 'resume-1', 'experience', 3);

      expect(moveItem).toHaveBeenCalledWith(mockConfig.sections, 1, 3);
    });

    it('should save updated config', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      await service.reorderSection('user-1', 'resume-1', 'education', 0);

      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          sections: expect.any(Array),
        }),
      );
    });
  });

  describe('reorderItem', () => {
    it('should update existing item order', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      const result = await service.reorderItem(
        'user-1',
        'resume-1',
        'experience',
        'exp-2',
        0,
      );

      expect(result).toEqual({ success: true });
      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          itemOverrides: expect.objectContaining({
            experience: expect.arrayContaining([
              expect.objectContaining({ itemId: 'exp-2', order: 0 }),
            ]),
          }),
        }),
      );
    });

    it('should add new item override if item not found', async () => {
      repo.get.mockResolvedValue({
        ...mockConfig,
        itemOverrides: {},
      });
      repo.save.mockResolvedValue(undefined);

      await service.reorderItem('user-1', 'resume-1', 'education', 'edu-1', 0);

      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          itemOverrides: expect.objectContaining({
            education: expect.arrayContaining([
              expect.objectContaining({
                itemId: 'edu-1',
                visible: true,
                order: 0,
              }),
            ]),
          }),
        }),
      );
    });

    it('should preserve visibility when updating order', async () => {
      const configWithHiddenItem = {
        ...mockConfig,
        itemOverrides: {
          experience: [{ itemId: 'exp-1', visible: false, order: 0 }],
        },
      };
      repo.get.mockResolvedValue(configWithHiddenItem);
      repo.save.mockResolvedValue(undefined);

      await service.reorderItem('user-1', 'resume-1', 'experience', 'exp-1', 2);

      const savedConfig = repo.save.mock.calls[0][1] as ResumeConfig;
      const exp1 = savedConfig.itemOverrides.experience.find(
        (i) => i.itemId === 'exp-1',
      );
      expect(exp1?.visible).toBe(false);
      expect(exp1?.order).toBe(2);
    });

    it('should create section array if not exists', async () => {
      repo.get.mockResolvedValue({
        ...mockConfig,
        itemOverrides: {},
      });
      repo.save.mockResolvedValue(undefined);

      await service.reorderItem('user-1', 'resume-1', 'projects', 'proj-1', 1);

      const savedConfig = repo.save.mock.calls[0][1] as ResumeConfig;
      expect(savedConfig.itemOverrides.projects).toBeDefined();
    });
  });

  describe('batchUpdate', () => {
    it('should update multiple sections at once', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      const updates = [
        { id: 'experience', visible: false },
        { id: 'education', order: 0 },
      ];

      const result = await service.batchUpdate('user-1', 'resume-1', updates);

      expect(result).toEqual({ success: true });
    });

    it('should update visibility in batch', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      const updates = [
        { id: 'experience', visible: false },
        { id: 'skills', visible: false },
      ];

      await service.batchUpdate('user-1', 'resume-1', updates);

      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({ id: 'experience', visible: false }),
            expect.objectContaining({ id: 'skills', visible: false }),
          ]),
        }),
      );
    });

    it('should update column assignment in batch', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      const updates = [{ id: 'skills', column: 'main' }];

      await service.batchUpdate('user-1', 'resume-1', updates);

      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({ id: 'skills', column: 'main' }),
          ]),
        }),
      );
    });

    it('should normalize orders after batch update', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      const { normalizeOrders } = require('../utils');

      const updates = [{ id: 'education', order: 10 }];

      await service.batchUpdate('user-1', 'resume-1', updates);

      expect(normalizeOrders).toHaveBeenCalled();
    });

    it('should ignore updates for non-existent sections', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      const updates = [{ id: 'non-existent', visible: false }];

      await service.batchUpdate('user-1', 'resume-1', updates);

      const savedConfig = repo.save.mock.calls[0][1] as ResumeConfig;
      expect(savedConfig.sections.length).toBe(mockConfig.sections.length);
    });
  });
});
