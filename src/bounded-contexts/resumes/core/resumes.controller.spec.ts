/**
 * Resumes Controller Unit Tests
 *
 * Tests the main resumes controller endpoints.
 * Focus: Request handling, parameter validation, service delegation.
 *
 * Pure tests - no mocks.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import type { CreateResume, UpdateResume } from '@/shared-kernel';
import {
  type ResumeResult,
  type ResumeSlots,
  ResumesServicePort,
  type UserResumesPaginatedResult,
} from './ports/resumes-service.port';
import { ResumesController } from './resumes.controller';

/**
 * Stub service that extends ResumesServicePort for type safety.
 * Tracks method calls for assertions.
 */
class StubResumesService extends ResumesServicePort {
  calls: Array<{ method: string; args: unknown[] }> = [];

  private mockResume: ResumeResult = {
    id: 'resume-456',
    userId: 'user-123',
    title: 'Software Engineer Resume',
    template: 'modern',
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  private mockPaginatedResumes: UserResumesPaginatedResult = {
    resumes: [this.mockResume],
    pagination: {
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };

  async findAllUserResumes(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<ResumeResult[] | UserResumesPaginatedResult> {
    this.calls.push({
      method: 'findAllUserResumes',
      args: [userId, page, limit],
    });
    return this.mockPaginatedResumes;
  }

  async findResumeByIdForUser(id: string, userId: string): Promise<ResumeResult> {
    this.calls.push({ method: 'findResumeByIdForUser', args: [id, userId] });
    return this.mockResume;
  }

  async getRemainingSlots(userId: string): Promise<ResumeSlots> {
    this.calls.push({ method: 'getRemainingSlots', args: [userId] });
    return { used: 2, limit: 4, remaining: 2 };
  }

  async createResumeForUser(userId: string, data: CreateResume): Promise<ResumeResult> {
    this.calls.push({ method: 'createResumeForUser', args: [userId, data] });
    return this.mockResume;
  }

  async updateResumeForUser(id: string, userId: string, data: UpdateResume): Promise<ResumeResult> {
    this.calls.push({
      method: 'updateResumeForUser',
      args: [id, userId, data],
    });
    return this.mockResume;
  }

  async deleteResumeForUser(id: string, userId: string): Promise<void> {
    this.calls.push({ method: 'deleteResumeForUser', args: [id, userId] });
  }

  getLastCall(method: string) {
    return this.calls.filter((c) => c.method === method).pop();
  }
}

describe('ResumesController', () => {
  let controller: ResumesController;
  let service: StubResumesService;

  const mockUser: UserPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    hasCompletedOnboarding: true,
  };

  const mockResume = {
    id: 'resume-456',
    userId: mockUser.userId,
    title: 'Software Engineer Resume',
    template: 'modern',
    isPublic: false,
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
  };

  const _mockPaginatedResumes = {
    resumes: [mockResume],
    pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
  };

  beforeEach(() => {
    service = new StubResumesService();
    controller = new ResumesController(service);
  });

  describe('getAllUserResumes', () => {
    it('should return DataResponse with paginated resumes', async () => {
      const result = await controller.getAllUserResumes(mockUser);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(service.getLastCall('findAllUserResumes')?.args).toEqual([
        mockUser.userId,
        undefined,
        undefined,
      ]);
    });

    it('should pass pagination parameters to service', async () => {
      await controller.getAllUserResumes(mockUser, 2, 25);

      expect(service.getLastCall('findAllUserResumes')?.args).toEqual([mockUser.userId, 2, 25]);
    });
  });

  describe('getRemainingSlots', () => {
    it('should return DataResponse with resume slots info', async () => {
      const result = await controller.getRemainingSlots(mockUser);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual({ used: 2, limit: 4, remaining: 2 });
      expect(service.getLastCall('getRemainingSlots')?.args).toEqual([mockUser.userId]);
    });
  });

  describe('getResumeByIdWithAllSections', () => {
    it('should return DataResponse with resume', async () => {
      const result = await controller.getResumeByIdWithAllSections('resume-456', mockUser);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(service.getLastCall('findResumeByIdForUser')?.args).toEqual([
        'resume-456',
        mockUser.userId,
      ]);
    });
  });

  describe('getResumeByIdForUser', () => {
    it('should return DataResponse with specific resume', async () => {
      const result = await controller.getResumeByIdForUser('resume-456', mockUser);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(service.getLastCall('findResumeByIdForUser')?.args).toEqual([
        'resume-456',
        mockUser.userId,
      ]);
    });
  });

  describe('createResumeForUser', () => {
    it('should return DataResponse with created resume', async () => {
      const createData = {
        title: 'New Resume',
        template: 'MINIMAL' as const,
        isPublic: false,
      };

      const result = await controller.createResumeForUser(mockUser, createData);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(service.getLastCall('createResumeForUser')?.args).toEqual([
        mockUser.userId,
        createData,
      ]);
    });
  });

  describe('updateResumeForUser', () => {
    it('should return DataResponse with updated resume', async () => {
      const updateData = { title: 'Updated Title' };

      const result = await controller.updateResumeForUser('resume-456', mockUser, updateData);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(service.getLastCall('updateResumeForUser')?.args).toEqual([
        'resume-456',
        mockUser.userId,
        updateData,
      ]);
    });
  });

  describe('deleteResumeForUser', () => {
    it('should return DataResponse with deleted confirmation', async () => {
      const result = await controller.deleteResumeForUser('resume-456', mockUser);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('deleted', true);
      expect(result.data).toHaveProperty('id', 'resume-456');
      expect(service.getLastCall('deleteResumeForUser')?.args).toEqual([
        'resume-456',
        mockUser.userId,
      ]);
    });
  });
});
