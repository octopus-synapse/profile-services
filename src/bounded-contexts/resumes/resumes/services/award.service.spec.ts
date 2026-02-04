/**
 * Award Service Unit Tests
 *
 * Tests the AwardService which extends BaseSubResourceService.
 * Focus: Verify inheritance behavior and entity-specific configuration.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Each test should have a single reason to fail"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AwardService } from './award.service';
import type { AwardRepository } from '../repositories/award.repository';
import type { ResumesRepository } from '../resumes.repository';
import type { EventPublisher } from '@/shared-kernel';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AwardService', () => {
  let service: AwardService;
  let mockAwardRepository: Partial<AwardRepository>;
  let mockResumesRepository: Partial<ResumesRepository>;
  let mockEventPublisher: Partial<EventPublisher>;

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-456';
  const mockAwardId = 'award-789';

  const mockAward = {
    id: mockAwardId,
    resumeId: mockResumeId,
    title: 'Best Innovation Award',
    issuer: 'Tech Innovation Summit',
    date: new Date('2024-06-15'),
    description: 'Awarded for innovative AI solution',
    url: 'https://example.com/award',
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
    mockAwardRepository = {
      findAllEntitiesForResume: mock(() =>
        Promise.resolve({
          data: [mockAward],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
      ),
      findEntityByIdAndResumeId: mock(() => Promise.resolve(mockAward)),
      createEntityForResume: mock(() => Promise.resolve(mockAward)),
      updateEntityForResume: mock(() => Promise.resolve(mockAward)),
      deleteEntityForResume: mock(() => Promise.resolve(true)),
    };

    mockResumesRepository = {
      findResumeByIdAndUserId: mock(() => Promise.resolve(mockResume)),
    };

    mockEventPublisher = {
      publish: mock(() => {}),
    };

    service = new AwardService(
      mockAwardRepository as AwardRepository,
      mockResumesRepository as ResumesRepository,
      mockEventPublisher as EventPublisher,
    );
  });

  describe('configuration', () => {
    it('should have correct entity name', () => {
      expect((service as unknown as { entityName: string }).entityName).toBe(
        'Award',
      );
    });

    it('should have correct section type for events', () => {
      expect((service as unknown as { sectionType: string }).sectionType).toBe(
        'awards',
      );
    });
  });

  describe('listAllEntitiesForResume', () => {
    it('should return paginated awards when user owns resume', async () => {
      const result = await service.listAllEntitiesForResume(
        mockResumeId,
        mockUserId,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Best Innovation Award');
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

    it('should use default pagination when not specified', async () => {
      await service.listAllEntitiesForResume(mockResumeId, mockUserId);

      expect(mockAwardRepository.findAllEntitiesForResume).toHaveBeenCalledWith(
        mockResumeId,
        1,
        20,
      );
    });

    it('should respect custom pagination parameters', async () => {
      await service.listAllEntitiesForResume(mockResumeId, mockUserId, 3, 15);

      expect(mockAwardRepository.findAllEntitiesForResume).toHaveBeenCalledWith(
        mockResumeId,
        3,
        15,
      );
    });
  });

  describe('getEntityByIdForResume', () => {
    it('should return award when found', async () => {
      const result = await service.getEntityByIdForResume(
        mockResumeId,
        mockAwardId,
        mockUserId,
      );

      expect(result.data?.title).toBe('Best Innovation Award');
      expect(result.data?.issuer).toBe('Tech Innovation Summit');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when award not found', async () => {
      (
        mockAwardRepository.findEntityByIdAndResumeId as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.getEntityByIdForResume(
          mockResumeId,
          'non-existent-id',
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate resume ownership before fetching award', async () => {
      await service.getEntityByIdForResume(
        mockResumeId,
        mockAwardId,
        mockUserId,
      );

      expect(
        mockResumesRepository.findResumeByIdAndUserId,
      ).toHaveBeenCalledWith(mockResumeId, mockUserId);
    });
  });

  describe('addEntityToResume', () => {
    it('should create award and return success response', async () => {
      const createData = {
        title: 'New Award',
        issuer: 'Award Organization',
        date: new Date('2024-08-01'),
        description: 'Description of the award',
      };

      const result = await service.addEntityToResume(
        mockResumeId,
        mockUserId,
        createData,
      );

      expect(result.success).toBe(true);
      expect(mockAwardRepository.createEntityForResume).toHaveBeenCalledWith(
        mockResumeId,
        createData,
      );
    });

    it('should publish SectionAddedEvent after creation', async () => {
      const createData = {
        title: 'Award for Excellence',
        issuer: 'Professional Association',
        date: new Date(),
      };

      await service.addEntityToResume(mockResumeId, mockUserId, createData);

      expect(mockEventPublisher.publish).toHaveBeenCalled();
      const publishedEvent = (
        mockEventPublisher.publish as ReturnType<typeof mock>
      ).mock.calls[0][0];
      expect(publishedEvent.payload.sectionType).toBe('awards');
      expect(publishedEvent.payload.userId).toBe(mockUserId);
    });
  });

  describe('updateEntityByIdForResume', () => {
    it('should update award and return success response', async () => {
      const updateData = {
        title: 'Updated Award Title',
        description: 'Updated description',
      };

      const result = await service.updateEntityByIdForResume(
        mockResumeId,
        mockAwardId,
        mockUserId,
        updateData,
      );

      expect(result.success).toBe(true);
      expect(mockAwardRepository.updateEntityForResume).toHaveBeenCalledWith(
        mockAwardId,
        mockResumeId,
        updateData,
      );
    });

    it('should publish SectionUpdatedEvent after update', async () => {
      await service.updateEntityByIdForResume(
        mockResumeId,
        mockAwardId,
        mockUserId,
        { title: 'New Title' },
      );

      expect(mockEventPublisher.publish).toHaveBeenCalled();
      const publishedEvent = (
        mockEventPublisher.publish as ReturnType<typeof mock>
      ).mock.calls[0][0];
      expect(publishedEvent.payload.sectionType).toBe('awards');
      expect(publishedEvent.payload.operation).toBe('updated');
    });

    it('should throw NotFoundException when award to update not found', async () => {
      (
        mockAwardRepository.updateEntityForResume as ReturnType<typeof mock>
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
    it('should delete award and return success message', async () => {
      const result = await service.deleteEntityByIdForResume(
        mockResumeId,
        mockAwardId,
        mockUserId,
      );

      expect(result.message).toBeDefined();
      expect(mockAwardRepository.deleteEntityForResume).toHaveBeenCalledWith(
        mockAwardId,
        mockResumeId,
      );
    });

    it('should publish SectionRemovedEvent after deletion', async () => {
      await service.deleteEntityByIdForResume(
        mockResumeId,
        mockAwardId,
        mockUserId,
      );

      expect(mockEventPublisher.publish).toHaveBeenCalled();
      const publishedEvent = (
        mockEventPublisher.publish as ReturnType<typeof mock>
      ).mock.calls[0][0];
      expect(publishedEvent.payload.sectionType).toBe('awards');
    });

    it('should throw NotFoundException when award to delete not found', async () => {
      (
        mockAwardRepository.deleteEntityForResume as ReturnType<typeof mock>
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
