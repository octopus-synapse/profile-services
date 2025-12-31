/**
 * Section Visibility Service Tests
 * Tests for showing/hiding sections and items
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SectionVisibilityService } from './section-visibility.service';
import {
  ResumeConfigRepository,
  ResumeConfig,
} from './resume-config.repository';

describe('SectionVisibilityService', () => {
  let service: SectionVisibilityService;
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
      ],
    },
  };

  beforeEach(async () => {
    const mockRepo = {
      get: jest.fn(),
      save: jest.fn(),
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('toggleSection', () => {
    it('should hide a visible section', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      const result = await service.toggleSection(
        'user-1',
        'resume-1',
        'experience',
        false,
      );

      expect(result).toEqual({ success: true });
      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({ id: 'experience', visible: false }),
          ]),
        }),
      );
    });

    it('should show a hidden section', async () => {
      const configWithHidden = {
        ...mockConfig,
        sections: mockConfig.sections.map((s) =>
          s.id === 'education' ? { ...s, visible: false } : s,
        ),
      };
      repo.get.mockResolvedValue(configWithHidden);
      repo.save.mockResolvedValue(undefined);

      const result = await service.toggleSection(
        'user-1',
        'resume-1',
        'education',
        true,
      );

      expect(result).toEqual({ success: true });
      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({ id: 'education', visible: true }),
          ]),
        }),
      );
    });

    it('should not modify other sections', async () => {
      repo.get.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue(undefined);

      await service.toggleSection('user-1', 'resume-1', 'experience', false);

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

      const result = await service.toggleItem(
        'user-1',
        'resume-1',
        'experience',
        'exp-1',
        false,
      );

      expect(result).toEqual({ success: true });
      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          itemOverrides: expect.objectContaining({
            experience: expect.arrayContaining([
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
          experience: [
            { itemId: 'exp-1', visible: false, order: 0 },
            { itemId: 'exp-2', visible: true, order: 1 },
          ],
        },
      };
      repo.get.mockResolvedValue(configWithHiddenItem);
      repo.save.mockResolvedValue(undefined);

      const result = await service.toggleItem(
        'user-1',
        'resume-1',
        'experience',
        'exp-1',
        true,
      );

      expect(result).toEqual({ success: true });
      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          itemOverrides: expect.objectContaining({
            experience: expect.arrayContaining([
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
        'education',
        'edu-1',
        false,
      );

      expect(repo.save).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          itemOverrides: expect.objectContaining({
            education: expect.arrayContaining([
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
        'experience',
        'exp-1',
        false,
      );

      const savedConfig = repo.save.mock.calls[0][1] as ResumeConfig;
      const exp1 = savedConfig.itemOverrides.experience.find(
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
        'experience',
        'exp-1',
        false,
      );

      const savedConfig = repo.save.mock.calls[0][1] as ResumeConfig;
      const exp2 = savedConfig.itemOverrides.experience.find(
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
