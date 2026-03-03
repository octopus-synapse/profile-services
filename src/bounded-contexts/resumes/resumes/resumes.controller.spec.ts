/**
 * Resumes Controller Unit Tests
 *
 * Tests the main resumes controller endpoints.
 * Focus: Request handling, parameter validation, service delegation.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Controllers should be thin, delegating to services"
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ResumesController } from './resumes.controller';
import type { ResumesService } from './resumes.service';

describe('ResumesController', () => {
  let controller: ResumesController;
  let mockResumesService: Partial<ResumesService>;

  const mockUser: UserPayload = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  const mockResume = {
    id: 'resume-456',
    userId: mockUser.userId,
    title: 'Software Engineer Resume',
    template: 'modern',
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResumes = {
    resumes: [mockResume],
    pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
  };

  beforeEach(() => {
    mockResumesService = {
      findAllUserResumes: mock(() => Promise.resolve(mockPaginatedResumes)),
      findResumeByIdForUser: mock(() => Promise.resolve(mockResume)),
      getRemainingSlots: mock(() =>
        Promise.resolve({ used: 2, limit: 4, remaining: 2 }),
      ),
      createResumeForUser: mock(() => Promise.resolve(mockResume)),
      updateResumeForUser: mock(() => Promise.resolve(mockResume)),
      deleteResumeForUser: mock(() => Promise.resolve(undefined)),
    };

    controller = new ResumesController(mockResumesService as ResumesService);
  });

  describe('getAllUserResumes', () => {
    it('should return DataResponse with paginated resumes', async () => {
      const result = await controller.getAllUserResumes(mockUser);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual({
        data: mockPaginatedResumes.resumes,
        meta: mockPaginatedResumes.pagination,
      });
      expect(mockResumesService.findAllUserResumes).toHaveBeenCalledWith(
        mockUser.userId,
        undefined,
        undefined,
      );
    });

    it('should pass pagination parameters to service', async () => {
      await controller.getAllUserResumes(mockUser, 2, 25);

      expect(mockResumesService.findAllUserResumes).toHaveBeenCalledWith(
        mockUser.userId,
        2,
        25,
      );
    });
  });

  describe('getRemainingSlots', () => {
    it('should return DataResponse with resume slots info', async () => {
      const result = await controller.getRemainingSlots(mockUser);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual({ used: 2, limit: 4, remaining: 2 });
      expect(mockResumesService.getRemainingSlots).toHaveBeenCalledWith(
        mockUser.userId,
      );
    });
  });

  describe('getResumeByIdWithAllSections', () => {
    it('should return DataResponse with resume', async () => {
      const result = await controller.getResumeByIdWithAllSections(
        mockResume.id,
        mockUser,
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockResume);
      expect(mockResumesService.findResumeByIdForUser).toHaveBeenCalledWith(
        mockResume.id,
        mockUser.userId,
      );
    });
  });

  describe('getResumeByIdForUser', () => {
    it('should return DataResponse with specific resume', async () => {
      const result = await controller.getResumeByIdForUser(
        mockResume.id,
        mockUser,
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockResume);
      expect(mockResumesService.findResumeByIdForUser).toHaveBeenCalledWith(
        mockResume.id,
        mockUser.userId,
      );
    });
  });

  describe('createResumeForUser', () => {
    it('should return DataResponse with created resume', async () => {
      const createData = {
        title: 'New Resume',
        template: 'minimal',
      };

      const result = await controller.createResumeForUser(mockUser, createData);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockResume);
      expect(mockResumesService.createResumeForUser).toHaveBeenCalledWith(
        mockUser.userId,
        createData,
      );
    });
  });

  describe('updateResumeForUser', () => {
    it('should return DataResponse with updated resume', async () => {
      const updateData = { title: 'Updated Title' };

      const result = await controller.updateResumeForUser(
        mockResume.id,
        mockUser,
        updateData,
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockResume);
      expect(mockResumesService.updateResumeForUser).toHaveBeenCalledWith(
        mockResume.id,
        mockUser.userId,
        updateData,
      );
    });
  });

  describe('deleteResumeForUser', () => {
    it('should return DataResponse with deleted confirmation', async () => {
      const result = await controller.deleteResumeForUser(
        mockResume.id,
        mockUser,
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('success', true);
      expect(mockResumesService.deleteResumeForUser).toHaveBeenCalledWith(
        mockResume.id,
        mockUser.userId,
      );
    });
  });
});
