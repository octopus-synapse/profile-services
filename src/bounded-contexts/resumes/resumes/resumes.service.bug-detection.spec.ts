/**
 * Resume Service Bug Detection Tests
 *
 * Pure Bun tests with typed stubs.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { createMockResume } from '@test/factories/resume.factory';
import type { CreateResume } from '@/shared-kernel';
import type { ResumeEventPublisher } from '../domain/ports';
import { ResumesService } from './resumes.service';

// ============================================================================
// Stub Classes
// ============================================================================

type Resume = ReturnType<typeof createMockResume>;

class StubResumesRepository {
  private resumes: Resume[] = [];
  findAllUserResumesCalledWith: string | null = null;

  setResumes(resumes: Resume[]): void {
    this.resumes = resumes;
  }

  async findAllUserResumes(userId: string): Promise<Resume[]> {
    this.findAllUserResumesCalledWith = userId;
    return this.resumes;
  }

  async findResumeByIdAndUserId(resumeId: string, userId: string): Promise<Resume | null> {
    return this.resumes.find((r) => r.id === resumeId && r.userId === userId) ?? null;
  }

  async createResumeForUser(userId: string, data: { title: string }): Promise<Resume> {
    const newResume = createMockResume({
      id: `resume-${this.resumes.length + 1}`,
      userId,
      title: data.title,
    });
    this.resumes.push(newResume);
    return newResume;
  }

  async updateResumeForUser(
    resumeId: string,
    _userId: string,
    data: Partial<Resume>,
  ): Promise<Resume> {
    const resume = this.resumes.find((r) => r.id === resumeId);
    if (!resume) throw new Error('Resume not found');
    return { ...resume, ...data };
  }

  async deleteResumeForUser(resumeId: string, _userId: string): Promise<boolean> {
    const index = this.resumes.findIndex((r) => r.id === resumeId);
    if (index === -1) return false;
    this.resumes.splice(index, 1);
    return true;
  }

  async findResumeByUserId(userId: string): Promise<Resume | null> {
    return this.resumes.find((r) => r.userId === userId) ?? null;
  }

  async findAllUserResumesPaginated(
    userId: string,
    _page: number,
    _limit: number,
  ): Promise<Resume[]> {
    return this.resumes.filter((r) => r.userId === userId);
  }

  async countUserResumes(userId: string): Promise<number> {
    return this.resumes.filter((r) => r.userId === userId).length;
  }
}

class StubResumeVersionService {
  async createSnapshot(): Promise<void> {}
  async getVersions(): Promise<
    Array<{
      id: string;
      versionNumber: number;
      label: string | null;
      createdAt: Date;
    }>
  > {
    return [];
  }
  async restoreVersion(): Promise<{ restoredFrom: Date }> {
    return { restoredFrom: new Date() };
  }
}

class StubResumeEventPublisher implements ResumeEventPublisher {
  publishResumeCreated(): void {}
  publishResumeUpdated(): void {}
  publishResumeDeleted(): void {}
  publishSectionAdded(): void {}
  publishSectionUpdated(): void {}
  publishSectionRemoved(): void {}
  publishVersionCreated(): void {}
  publishVersionRestored(): void {}
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a ResumesService with test stubs.
 * Encapsulates internal type handling to keep test code clean.
 */
function createTestService(
  repository: StubResumesRepository,
  versionService: StubResumeVersionService,
  eventPublisher: StubResumeEventPublisher,
): ResumesService {
  return new ResumesService(
    repository as ConstructorParameters<typeof ResumesService>[0],
    versionService as ConstructorParameters<typeof ResumesService>[1],
    eventPublisher,
  );
}

/**
 * Creates valid CreateResume data with sensible defaults.
 */
function createResumeDto(overrides: Partial<CreateResume> = {}): CreateResume {
  return {
    title: 'Test Resume',
    template: 'PROFESSIONAL',
    isPublic: false,
    ...overrides,
  };
}

describe('ResumesService - Bug Detection', () => {
  let service: ResumesService;
  let stubRepository: StubResumesRepository;
  let stubVersionService: StubResumeVersionService;
  let stubEventPublisher: StubResumeEventPublisher;

  const _mockResume = createMockResume({
    id: 'resume-1',
    userId: 'user-123',
    title: 'Test Resume',
  });

  beforeEach(() => {
    stubRepository = new StubResumesRepository();
    stubVersionService = new StubResumeVersionService();
    stubEventPublisher = new StubResumeEventPublisher();

    service = createTestService(stubRepository, stubVersionService, stubEventPublisher);
  });

  /**
   * BUG #3: Resume limit should return HTTP 422, not 400
   *
   * Business Rule: "When trying to create the 5th resume:
   *                 - Business rule error
   *                 - Recommended status: 422
   *                 - Clear message: 'The maximum resume limit is 4'"
   */
  describe('BUG #3: Resume limit should return HTTP 422', () => {
    it('should throw UnprocessableEntityException (422) when limit reached', async () => {
      // User already has 4 resumes
      stubRepository.setResumes([
        createMockResume({ id: '1', userId: 'user-123' }),
        createMockResume({ id: '2', userId: 'user-123' }),
        createMockResume({ id: '3', userId: 'user-123' }),
        createMockResume({ id: '4', userId: 'user-123' }),
      ]);

      // Trying to create 5th should throw 422
      await expect(
        service.createResumeForUser('user-123', createResumeDto({ title: 'Fifth Resume' })),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should NOT throw BadRequestException (400) for limit error', async () => {
      stubRepository.setResumes([
        createMockResume({ id: '1', userId: 'user-123' }),
        createMockResume({ id: '2', userId: 'user-123' }),
        createMockResume({ id: '3', userId: 'user-123' }),
        createMockResume({ id: '4', userId: 'user-123' }),
      ]);

      // This exposes the bug: it currently throws BadRequestException
      try {
        await service.createResumeForUser('user-123', createResumeDto({ title: 'Fifth Resume' }));
        throw new Error('Should have thrown an exception');
      } catch (error) {
        // Bug: this will fail because error IS BadRequestException
        expect(error).not.toBeInstanceOf(BadRequestException);
        expect(error).toBeInstanceOf(UnprocessableEntityException);
      }
    });

    it('should have clear message about the limit', async () => {
      stubRepository.setResumes([
        createMockResume({ id: '1', userId: 'user-123' }),
        createMockResume({ id: '2', userId: 'user-123' }),
        createMockResume({ id: '3', userId: 'user-123' }),
        createMockResume({ id: '4', userId: 'user-123' }),
      ]);

      try {
        await service.createResumeForUser('user-123', createResumeDto({ title: 'Fifth Resume' }));
        throw new Error('Should have thrown');
      } catch (error) {
        // Check for specific message per business rule
        expect((error as Error).message).toInclude('4');
        expect((error as Error).message.toLowerCase()).toInclude('limit');
      }
    });
  });

  /**
   * Boundary testing for resume limit
   */
  describe('Resume limit boundary tests', () => {
    it('should allow creating 4th resume (at limit)', async () => {
      stubRepository.setResumes([
        createMockResume({ id: '1', userId: 'user-123' }),
        createMockResume({ id: '2', userId: 'user-123' }),
        createMockResume({ id: '3', userId: 'user-123' }),
      ]);

      const result = await service.createResumeForUser(
        'user-123',
        createResumeDto({ title: 'Fourth Resume' }),
      );

      // Service returns the resume directly
      expect(result).toBeDefined();
      expect(result.title).toBe('Fourth Resume');
    });

    it('should reject at exactly 4 existing resumes', async () => {
      stubRepository.setResumes([
        createMockResume({ id: '1', userId: 'user-123' }),
        createMockResume({ id: '2', userId: 'user-123' }),
        createMockResume({ id: '3', userId: 'user-123' }),
        createMockResume({ id: '4', userId: 'user-123' }),
      ]);

      await expect(
        service.createResumeForUser('user-123', createResumeDto({ title: 'Fifth' })),
      ).rejects.toThrow();
    });
  });
});
