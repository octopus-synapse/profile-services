/**
 * Skill Service Unit Tests
 *
 * Tests the SkillService which extends BaseSubResourceService and adds
 * skill-specific functionality like bulk operations and category filtering.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Each test should have a single reason to fail"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { SkillService } from './skill.service';
import type { SkillRepository } from '../repositories/skill.repository';
import type { ResumesRepository } from '../resumes.repository';
import type { EventPublisher } from '@/shared-kernel';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('SkillService', () => {
  let service: SkillService;
  let mockSkillRepository: Partial<SkillRepository>;
  let mockResumesRepository: Partial<ResumesRepository>;
  let mockEventPublisher: Partial<EventPublisher>;

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-456';
  const mockSkillId = 'skill-789';

  const mockSkill = {
    id: mockSkillId,
    resumeId: mockResumeId,
    name: 'TypeScript',
    level: 'Expert',
    category: 'Programming Languages',
    yearsOfExperience: 5,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockResume = {
    id: mockResumeId,
    userId: mockUserId,
    title: 'Software Engineer Resume',
  };

  beforeEach(() => {
    mockSkillRepository = {
      findAllEntitiesForResume: mock(() =>
        Promise.resolve({
          data: [mockSkill],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
      ),
      findEntityByIdAndResumeId: mock(() => Promise.resolve(mockSkill)),
      createEntityForResume: mock(() => Promise.resolve(mockSkill)),
      updateEntityForResume: mock(() => Promise.resolve(mockSkill)),
      deleteEntityForResume: mock(() => Promise.resolve(true)),
      // Skill-specific methods
      findAllSkillsForResume: mock(() =>
        Promise.resolve({
          data: [mockSkill],
          meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
        }),
      ),
      createMany: mock(() => Promise.resolve(3)),
      deleteByCategory: mock(() => Promise.resolve(5)),
      getCategories: mock(() =>
        Promise.resolve(['Programming Languages', 'Frameworks', 'Databases']),
      ),
    };

    mockResumesRepository = {
      findResumeByIdAndUserId: mock(() => Promise.resolve(mockResume)),
    };

    mockEventPublisher = {
      publish: mock(() => {}),
    };

    service = new SkillService(
      mockSkillRepository as SkillRepository,
      mockResumesRepository as ResumesRepository,
      mockEventPublisher as EventPublisher,
    );
  });

  describe('configuration', () => {
    it('should have correct entity name', () => {
      expect((service as unknown as { entityName: string }).entityName).toBe(
        'Skill',
      );
    });

    it('should have correct section type for events', () => {
      expect((service as unknown as { sectionType: string }).sectionType).toBe(
        'skills',
      );
    });
  });

  describe('inherited CRUD operations', () => {
    describe('listAllEntitiesForResume', () => {
      it('should return paginated skills when user owns resume', async () => {
        const result = await service.listAllEntitiesForResume(
          mockResumeId,
          mockUserId,
        );

        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('TypeScript');
      });

      it('should throw ForbiddenException when user does not own resume', async () => {
        (
          mockResumesRepository.findResumeByIdAndUserId as ReturnType<
            typeof mock
          >
        ).mockResolvedValue(null);

        await expect(
          service.listAllEntitiesForResume(mockResumeId, 'other-user'),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getEntityByIdForResume', () => {
      it('should return skill when found', async () => {
        const result = await service.getEntityByIdForResume(
          mockResumeId,
          mockSkillId,
          mockUserId,
        );

        expect(result.data?.name).toBe('TypeScript');
        expect(result.success).toBe(true);
      });

      it('should throw NotFoundException when skill not found', async () => {
        (
          mockSkillRepository.findEntityByIdAndResumeId as ReturnType<
            typeof mock
          >
        ).mockResolvedValue(null);

        await expect(
          service.getEntityByIdForResume(
            mockResumeId,
            'non-existent',
            mockUserId,
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('addEntityToResume', () => {
      it('should create skill and publish SectionAddedEvent', async () => {
        const createData = {
          name: 'React',
          level: 'Expert',
          category: 'Frameworks',
        };

        const result = await service.addEntityToResume(
          mockResumeId,
          mockUserId,
          createData,
        );

        expect(result.success).toBe(true);
        expect(mockEventPublisher.publish).toHaveBeenCalled();
      });
    });
  });

  describe('findAllSkillsForResume', () => {
    it('should return skills with higher default limit', async () => {
      const result = await service.findAllSkillsForResume(
        mockResumeId,
        mockUserId,
      );

      expect(result.data).toHaveLength(1);
      expect(mockSkillRepository.findAllSkillsForResume).toHaveBeenCalledWith(
        mockResumeId,
        1,
        50,
        undefined,
      );
    });

    it('should support category filter', async () => {
      await service.findAllSkillsForResume(
        mockResumeId,
        mockUserId,
        1,
        50,
        'Programming Languages',
      );

      expect(mockSkillRepository.findAllSkillsForResume).toHaveBeenCalledWith(
        mockResumeId,
        1,
        50,
        'Programming Languages',
      );
    });

    it('should validate resume ownership before fetching skills', async () => {
      (
        mockResumesRepository.findResumeByIdAndUserId as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.findAllSkillsForResume(mockResumeId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should support custom pagination', async () => {
      await service.findAllSkillsForResume(mockResumeId, mockUserId, 2, 25);

      expect(mockSkillRepository.findAllSkillsForResume).toHaveBeenCalledWith(
        mockResumeId,
        2,
        25,
        undefined,
      );
    });
  });

  describe('createMany', () => {
    it('should bulk create skills and return count', async () => {
      const bulkData = {
        skills: [
          { name: 'TypeScript', level: 'Expert', category: 'Languages' },
          { name: 'React', level: 'Advanced', category: 'Frameworks' },
          { name: 'PostgreSQL', level: 'Intermediate', category: 'Databases' },
        ],
      };

      const result = await service.createMany(
        mockResumeId,
        mockUserId,
        bulkData,
      );

      expect(result.data?.count).toBe(3);
      expect(result.message).toBe('Skills created successfully');
      expect(mockSkillRepository.createMany).toHaveBeenCalledWith(
        mockResumeId,
        bulkData.skills,
      );
    });

    it('should validate resume ownership before bulk create', async () => {
      (
        mockResumesRepository.findResumeByIdAndUserId as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.createMany(mockResumeId, 'other-user', { skills: [] }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeByCategory', () => {
    it('should delete skills by category and return count', async () => {
      const result = await service.removeByCategory(
        mockResumeId,
        mockUserId,
        'Programming Languages',
      );

      expect(result.data?.count).toBe(5);
      expect(result.message).toBe('Skills deleted successfully');
      expect(mockSkillRepository.deleteByCategory).toHaveBeenCalledWith(
        mockResumeId,
        'Programming Languages',
      );
    });

    it('should validate resume ownership before deleting by category', async () => {
      (
        mockResumesRepository.findResumeByIdAndUserId as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.removeByCategory(mockResumeId, 'other-user', 'Languages'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return zero count when no skills in category', async () => {
      (
        mockSkillRepository.deleteByCategory as ReturnType<typeof mock>
      ).mockResolvedValue(0);

      const result = await service.removeByCategory(
        mockResumeId,
        mockUserId,
        'Non-Existent Category',
      );

      expect(result.data?.count).toBe(0);
    });
  });

  describe('getCategories', () => {
    it('should return all unique categories for a resume', async () => {
      const result = await service.getCategories(mockResumeId, mockUserId);

      expect(result).toEqual([
        'Programming Languages',
        'Frameworks',
        'Databases',
      ]);
      expect(mockSkillRepository.getCategories).toHaveBeenCalledWith(
        mockResumeId,
      );
    });

    it('should validate resume ownership before getting categories', async () => {
      (
        mockResumesRepository.findResumeByIdAndUserId as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.getCategories(mockResumeId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return empty array when no categories exist', async () => {
      (
        mockSkillRepository.getCategories as ReturnType<typeof mock>
      ).mockResolvedValue([]);

      const result = await service.getCategories(mockResumeId, mockUserId);

      expect(result).toEqual([]);
    });
  });
});
