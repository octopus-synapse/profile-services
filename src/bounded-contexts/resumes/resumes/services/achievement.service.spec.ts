/**
 * Achievement Service Unit Tests
 *
 * Tests the AchievementService which extends BaseSubResourceService.
 * Focus: Verify inheritance behavior and entity-specific configuration.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Each test should have a single reason to fail"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AchievementService } from './achievement.service';
import type { AchievementRepository } from '../repositories/achievement.repository';
import type { ResumesRepository } from '../resumes.repository';
import type { EventPublisher } from '@/shared-kernel';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AchievementService', () => {
  let service: AchievementService;
  let mockAchievementRepository: Partial<AchievementRepository>;
  let mockResumesRepository: Partial<ResumesRepository>;
  let mockEventPublisher: Partial<EventPublisher>;

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-456';
  const mockAchievementId = 'achievement-789';

  const mockAchievement = {
    id: mockAchievementId,
    resumeId: mockResumeId,
    title: 'Top Performer Award',
    description: 'Recognized as top performer in Q4 2024',
    date: new Date('2024-12-01'),
    issuer: 'Tech Corp',
    url: 'https://example.com/achievement',
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
    mockAchievementRepository = {
      findAllEntitiesForResume: mock(() =>
        Promise.resolve({
          data: [mockAchievement],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
      ),
      findEntityByIdAndResumeId: mock(() => Promise.resolve(mockAchievement)),
      createEntityForResume: mock(() => Promise.resolve(mockAchievement)),
      updateEntityForResume: mock(() => Promise.resolve(mockAchievement)),
      deleteEntityForResume: mock(() => Promise.resolve(true)),
    };

    mockResumesRepository = {
      findResumeByIdAndUserId: mock(() => Promise.resolve(mockResume)),
    };

    mockEventPublisher = {
      publish: mock(() => {}),
    };

    service = new AchievementService(
      mockAchievementRepository as AchievementRepository,
      mockResumesRepository as ResumesRepository,
      mockEventPublisher as EventPublisher,
    );
  });

  describe('configuration', () => {
    it('should have correct entity name', () => {
      // Access protected property via type assertion for testing
      expect((service as unknown as { entityName: string }).entityName).toBe(
        'Achievement',
      );
    });

    it('should have correct section type for events', () => {
      expect((service as unknown as { sectionType: string }).sectionType).toBe(
        'achievements',
      );
    });
  });

  describe('listAllEntitiesForResume', () => {
    it('should return paginated achievements when user owns resume', async () => {
      const result = await service.listAllEntitiesForResume(
        mockResumeId,
        mockUserId,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Top Performer Award');
      expect(
        mockResumesRepository.findResumeByIdAndUserId,
      ).toHaveBeenCalledWith(mockResumeId, mockUserId);
    });

    it('should throw ForbiddenException when user does not own resume', async () => {
      (
        mockResumesRepository.findResumeByIdAndUserId as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.listAllEntitiesForResume(mockResumeId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should support custom pagination parameters', async () => {
      await service.listAllEntitiesForResume(mockResumeId, mockUserId, 2, 10);

      expect(
        mockAchievementRepository.findAllEntitiesForResume,
      ).toHaveBeenCalledWith(mockResumeId, 2, 10);
    });
  });

  describe('getEntityByIdForResume', () => {
    it('should return achievement when found', async () => {
      const result = await service.getEntityByIdForResume(
        mockResumeId,
        mockAchievementId,
        mockUserId,
      );

      expect(result.data?.title).toBe('Top Performer Award');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when achievement not found', async () => {
      (
        mockAchievementRepository.findEntityByIdAndResumeId as ReturnType<
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
    it('should create achievement and publish SectionAddedEvent', async () => {
      const createData = {
        title: 'New Achievement',
        description: 'Description of the achievement',
        date: new Date('2024-12-15'),
        issuer: 'Tech Corp',
      };

      const result = await service.addEntityToResume(
        mockResumeId,
        mockUserId,
        createData,
      );

      expect(result.success).toBe(true);
      expect(
        mockAchievementRepository.createEntityForResume,
      ).toHaveBeenCalledWith(mockResumeId, createData);
      expect(mockEventPublisher.publish).toHaveBeenCalled();

      const publishedEvent = (
        mockEventPublisher.publish as ReturnType<typeof mock>
      ).mock.calls[0][0];
      expect(publishedEvent.constructor.name).toBe('SectionAddedEvent');
    });
  });

  describe('updateEntityByIdForResume', () => {
    it('should update achievement and publish SectionUpdatedEvent', async () => {
      const updateData = {
        title: 'Updated Achievement Title',
      };

      const result = await service.updateEntityByIdForResume(
        mockResumeId,
        mockAchievementId,
        mockUserId,
        updateData,
      );

      expect(result.success).toBe(true);
      expect(
        mockAchievementRepository.updateEntityForResume,
      ).toHaveBeenCalledWith(mockAchievementId, mockResumeId, updateData);
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException when achievement to update not found', async () => {
      (
        mockAchievementRepository.updateEntityForResume as ReturnType<
          typeof mock
        >
      ).mockResolvedValue(null);

      await expect(
        service.updateEntityByIdForResume(
          mockResumeId,
          'non-existent',
          mockUserId,
          { title: 'New Title' },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteEntityByIdForResume', () => {
    it('should delete achievement and publish SectionRemovedEvent', async () => {
      const result = await service.deleteEntityByIdForResume(
        mockResumeId,
        mockAchievementId,
        mockUserId,
      );

      expect(result.message).toBeDefined();
      expect(
        mockAchievementRepository.deleteEntityForResume,
      ).toHaveBeenCalledWith(mockAchievementId, mockResumeId);
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException when achievement to delete not found', async () => {
      (
        mockAchievementRepository.deleteEntityForResume as ReturnType<
          typeof mock
        >
      ).mockResolvedValue(false);

      await expect(
        service.deleteEntityByIdForResume(
          mockResumeId,
          'non-existent',
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
