/**
 * Section Visibility Service Tests
 * Tests for showing/hiding sections and items
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { SectionVisibilityService } from './section-visibility.service';
import {
  ResumeConfigRepository,
  ResumeConfig,
} from './resume-config.repository';

describe('SectionVisibilityService', () => {
  let service: SectionVisibilityService;
  let repo: {
    get: any;
    save: any;
  };

  const mockConfig: ResumeConfig = {
    sections: [
      { id: 'header', visible: true, order: 0, column: 'main' },
      { id: 'work_experience_v1', visible: true, order: 1, column: 'main' },
      { id: 'education_v1', visible: true, order: 2, column: 'main' },
      { id: 'skill_set_v1', visible: true, order: 3, column: 'sidebar' },
    ],
    itemOverrides: {
      work_experience_v1: [
        { itemId: 'exp-1', visible: true, order: 0 },
        { itemId: 'exp-2', visible: true, order: 1 },
      ],
    },
  };

  beforeEach(async () => {
    const mockRepo = {
      get: mock(),
      save: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectionVisibilityService,
        { provide: ResumeConfigRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SectionVisibilityService>(SectionVisibilityService);
    repo = mockRepo;
  });

  afterEach(() => {});

  describe('toggleSection', () => {
    it('should hide a visible section', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      await service.toggleSection(
        'user-1',
        'resume-1',
        'work_experience_v1',
        false,
      );

      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              id: 'work_experience_v1',
              visible: false,
            }),
          ]),
        }),
      );
    });

    it('should show a hidden section', async () => {
      const configWithHidden = {
        ...mockConfig,
        sections: mockConfig.sections.map((s) =>
          s.id === 'education_v1' ? { ...s, visible: false } : s,
        ),
      };
      repo.get.mockResolvedValue(configWithHidden);
      repo.save.mockResolvedValue(undefined);

      await service.toggleSection('user-1', 'resume-1', 'education_v1', true);

      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({ id: 'education_v1', visible: true }),
          ]),
        }),
      );
    });

    it('should not modify other sections', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      await service.toggleSection(
        'user-1',
        'resume-1',
        'work_experience_v1',
        false,
      );

      const savedConfig = repo.save.mock.calls[0][1] as ResumeConfig;
      const headerSection = savedConfig.sections.find((s) => s.id === 'header');
      expect(headerSection?.visible).toBe(true);
    });

    it('should not modify section if id not found', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      await service.toggleSection('user-1', 'resume-1', 'non-existent', false);

      const savedConfig = repo.save.mock.calls[0][1] as ResumeConfig;
      expect(savedConfig.sections).toEqual(mockConfig.sections);
    });
  });

  describe('toggleItem', () => {
    it('should hide a visible item', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      await service.toggleItem(
        'user-1',
        'resume-1',
        'work_experience_v1',
        'exp-1',
        false,
      );

      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          itemOverrides: expect.objectContaining({
            work_experience_v1: expect.arrayContaining([
              expect.objectContaining({ itemId: 'exp-1', visible: false }),
            ]),
          }),
        }),
      );
    });

    it('should show a hidden item', async () => {
      const configWithHiddenItem = {
        ...mockConfig,
        itemOverrides: {
          work_experience_v1: [
            { itemId: 'exp-1', visible: false, order: 0 },
            { itemId: 'exp-2', visible: true, order: 1 },
          ],
        },
      };
      repo.get.mockResolvedValue(configWithHiddenItem);
      repo.save.mockResolvedValue(undefined);

      await service.toggleItem(
        'user-1',
        'resume-1',
        'work_experience_v1',
        'exp-1',
        true,
      );

      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          itemOverrides: expect.objectContaining({
            work_experience_v1: expect.arrayContaining([
              expect.objectContaining({ itemId: 'exp-1', visible: true }),
            ]),
          }),
        }),
      );
    });

    it('should add new item override if not exists', async () => {
      repo.get.mockResolvedValue({
        ...mockConfig,
        itemOverrides: {},
      });
      repo.save.mockResolvedValue(undefined);

      await service.toggleItem(
        'user-1',
        'resume-1',
        'education_v1',
        'edu-1',
        false,
      );

      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          itemOverrides: expect.objectContaining({
            education_v1: expect.arrayContaining([
              expect.objectContaining({
                itemId: 'edu-1',
                visible: false,
                order: 999,
              }),
            ]),
          }),
        }),
      );
    });

    it('should preserve order when toggling visibility', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      await service.toggleItem(
        'user-1',
        'resume-1',
        'work_experience_v1',
        'exp-1',
        false,
      );

      const savedConfig = repo.save.mock.calls[0][1] as ResumeConfig;
      const exp1 = savedConfig.itemOverrides.work_experience_v1.find(
        (i) => i.itemId === 'exp-1',
      );
      expect(exp1?.order).toBe(0);
    });

    it('should not modify other items in the same section', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      await service.toggleItem(
        'user-1',
        'resume-1',
        'work_experience_v1',
        'exp-1',
        false,
      );

      const savedConfig = repo.save.mock.calls[0][1] as ResumeConfig;
      const exp2 = savedConfig.itemOverrides.work_experience_v1.find(
        (i) => i.itemId === 'exp-2',
      );
      expect(exp2?.visible).toBe(true);
    });

    it('should create section override array if not exists', async () => {
      repo.get.mockResolvedValue({
        ...mockConfig,
        itemOverrides: {},
      });
      repo.save.mockResolvedValue(undefined);

      await service.toggleItem(
        'user-1',
        'resume-1',
        'projects',
        'proj-1',
        false,
      );

      const savedConfig = repo.save.mock.calls[0][1] as ResumeConfig;
      expect(savedConfig.itemOverrides.projects).toBeDefined();
      expect(savedConfig.itemOverrides.projects).toHaveLength(1);
    });
  });
});
