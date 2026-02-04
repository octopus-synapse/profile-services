/**
 * Resumes Controller Unit Tests
 *
 * Tests the main resumes controller endpoints.
 * Focus: Request handling, parameter validation, service delegation.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Controllers should be thin, delegating to services"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ResumesController } from './resumes.controller';
import type { ResumesService } from './resumes.service';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';

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
    data: [mockResume],
    meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
  };

  beforeEach(() => {
    mockResumesService = {
      findAllUserResumes: mock(() => Promise.resolve(mockPaginatedResumes)),
      findResumeByIdForUser: mock(() => Promise.resolve({ data: mockResume })),
      getRemainingSlots: mock(() =>
        Promise.resolve({ used: 2, limit: 4, remaining: 2 }),
      ),
      createResumeForUser: mock(() =>
        Promise.resolve({ data: mockResume, message: 'Resume created' }),
      ),
      updateResumeForUser: mock(() =>
        Promise.resolve({ data: mockResume, message: 'Resume updated' }),
      ),
      deleteResumeForUser: mock(() =>
        Promise.resolve({ message: 'Resume deleted' }),
      ),
    };

    controller = new ResumesController(mockResumesService as ResumesService);
  });

  describe('getAllUserResumes', () => {
    it('should return paginated resumes for current user', async () => {
      const result = await controller.getAllUserResumes(mockUser);

      expect(result).toEqual(mockPaginatedResumes);
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
    it('should return resume slots info', async () => {
      const result = await controller.getRemainingSlots(mockUser);

      expect(result).toEqual({ used: 2, limit: 4, remaining: 2 });
      expect(mockResumesService.getRemainingSlots).toHaveBeenCalledWith(
        mockUser.userId,
      );
    });
  });

  describe('getResumeByIdWithAllSections', () => {
    it('should return resume with all sections', async () => {
      const result = await controller.getResumeByIdWithAllSections(
        mockResume.id,
        mockUser,
      );

      expect(result.data).toEqual(mockResume);
      expect(mockResumesService.findResumeByIdForUser).toHaveBeenCalledWith(
        mockResume.id,
        mockUser.userId,
      );
    });
  });

  describe('getResumeByIdForUser', () => {
    it('should return specific resume', async () => {
      const result = await controller.getResumeByIdForUser(
        mockResume.id,
        mockUser,
      );

      expect(result.data).toEqual(mockResume);
      expect(mockResumesService.findResumeByIdForUser).toHaveBeenCalledWith(
        mockResume.id,
        mockUser.userId,
      );
    });
  });

  describe('createResumeForUser', () => {
    it('should create resume and return result', async () => {
      const createData = {
        title: 'New Resume',
        template: 'minimal',
      };

      const result = await controller.createResumeForUser(mockUser, createData);

      expect(result.data).toBeDefined();
      expect(mockResumesService.createResumeForUser).toHaveBeenCalledWith(
        mockUser.userId,
        createData,
      );
    });
  });

  describe('updateResumeForUser', () => {
    it('should update resume and return result', async () => {
      const updateData = { title: 'Updated Title' };

      const result = await controller.updateResumeForUser(
        mockResume.id,
        mockUser,
        updateData,
      );

      expect(result.data).toBeDefined();
      expect(mockResumesService.updateResumeForUser).toHaveBeenCalledWith(
        mockResume.id,
        mockUser.userId,
        updateData,
      );
    });
  });

  describe('deleteResumeForUser', () => {
    it('should delete resume and return success message', async () => {
      const result = await controller.deleteResumeForUser(
        mockResume.id,
        mockUser,
      );

      expect(result.message).toBe('Resume deleted');
      expect(mockResumesService.deleteResumeForUser).toHaveBeenCalledWith(
        mockResume.id,
        mockUser.userId,
      );
    });
  });
});
