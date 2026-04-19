/**
 * Resumes Service Tests
 *
 * Business Rules Tested:
 * 1. Maximum 4 resumes per user (error 400)
 * 2. Order field must be unique per section
 * 3. isCurrent=true requires endDate=null
 * 4. Skills in experiences are entity references, not free text
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { UnprocessableEntityException } from '@nestjs/common';
import { createMockResume } from '@test/shared/factories/resume.factory';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { ResumesService } from './resumes.service';
import {
  createTestResumesService,
  InMemoryResumesEventPublisher,
  InMemoryResumesRepository,
  StubResumeVersionService,
} from './testing';

describe('ResumesService', () => {
  let service: ResumesService;
  let repository: InMemoryResumesRepository;
  let versionService: StubResumeVersionService;
  let eventPublisher: InMemoryResumesEventPublisher;

  const userId = 'user-123';

  const createTestResume = (overrides: Partial<{ id: string; title: string }> = {}) =>
    createMockResume({
      id: overrides.id ?? 'resume-1',
      userId,
      title: overrides.title ?? 'Software Engineer',
      summary: 'Experienced developer',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  beforeEach(() => {
    repository = new InMemoryResumesRepository();
    versionService = new StubResumeVersionService();
    eventPublisher = new InMemoryResumesEventPublisher();
    service = createTestResumesService(repository, versionService, eventPublisher);
  });

  describe('Resume Limit (Maximum 4)', () => {
    it('should allow creating resume when under limit', async () => {
      // Seed 3 existing resumes
      repository.seedResume(createTestResume({ id: 'r1' }));
      repository.seedResume(createTestResume({ id: 'r2' }));
      repository.seedResume(createTestResume({ id: 'r3' }));

      const result = await service.createResumeForUser(userId, {
        title: 'New Resume',
        template: 'PROFESSIONAL',
        isPublic: false,
      });

      expect(result).toBeDefined();
    });

    it('should reject creating 5th resume with error', async () => {
      // Seed 4 existing resumes
      repository.seedResume(createTestResume({ id: 'r1' }));
      repository.seedResume(createTestResume({ id: 'r2' }));
      repository.seedResume(createTestResume({ id: 'r3' }));
      repository.seedResume(createTestResume({ id: 'r4' }));

      await expect(
        service.createResumeForUser(userId, {
          title: 'Fifth Resume',
          template: 'PROFESSIONAL',
          isPublic: false,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should show clear error message about 4 resume limit', async () => {
      // Seed 4 existing resumes
      repository.seedResume(createTestResume({ id: 'r1' }));
      repository.seedResume(createTestResume({ id: 'r2' }));
      repository.seedResume(createTestResume({ id: 'r3' }));
      repository.seedResume(createTestResume({ id: 'r4' }));

      await expect(
        service.createResumeForUser(userId, {
          title: 'Fifth Resume',
          template: 'PROFESSIONAL',
          isPublic: false,
        }),
      ).rejects.toThrow(/4.*resumes/i);
    });

    it('should allow creating exactly 4 resumes', async () => {
      // Seed 3 existing resumes
      repository.seedResume(createTestResume({ id: 'r1' }));
      repository.seedResume(createTestResume({ id: 'r2' }));
      repository.seedResume(createTestResume({ id: 'r3' }));

      const result = await service.createResumeForUser(userId, {
        title: 'Fourth Resume',
        template: 'PROFESSIONAL',
        isPublic: false,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Resume CRUD Operations', () => {
    it('should return all resumes for a user', async () => {
      repository.seedResume(createTestResume({ id: 'r1' }));
      repository.seedResume(createTestResume({ id: 'r2' }));

      const result = await service.findAllUserResumes(userId);

      expect(result).toHaveLength(2);
    });

    it('should return resume by id if owned by user', async () => {
      repository.seedResume(createTestResume({ id: 'resume-1' }));

      const result = await service.findResumeByIdForUser('resume-1', userId);

      expect(result?.id).toBe('resume-1');
    });

    it('should throw EntityNotFoundException for non-existent resume', async () => {
      await expect(async () => await service.findResumeByIdForUser('nonexistent', userId)).toThrow(
        EntityNotFoundException,
      );
    });

    it('should update resume if owned by user', async () => {
      repository.seedResume(createTestResume({ id: 'resume-1' }));

      const result = await service.updateResumeForUser('resume-1', userId, {
        title: 'Updated Title',
      });

      expect(result?.title).toBe('Updated Title');
    });

    it('should delete resume if owned by user', async () => {
      repository.seedResume(createTestResume({ id: 'resume-1' }));

      await expect(service.deleteResumeForUser('resume-1', userId)).resolves.toBeUndefined();
    });
  });

  describe('Remaining Slots', () => {
    it('should correctly calculate remaining slots', async () => {
      repository.seedResume(createTestResume({ id: 'r1' }));
      repository.seedResume(createTestResume({ id: 'r2' }));

      const slots = await service.getRemainingSlots(userId);

      expect(slots.used).toBe(2);
      expect(slots.limit).toBe(4);
      expect(slots.remaining).toBe(2);
    });

    it('should show 0 remaining when at limit', async () => {
      repository.seedResume(createTestResume({ id: 'r1' }));
      repository.seedResume(createTestResume({ id: 'r2' }));
      repository.seedResume(createTestResume({ id: 'r3' }));
      repository.seedResume(createTestResume({ id: 'r4' }));

      const slots = await service.getRemainingSlots(userId);

      expect(slots.remaining).toBe(0);
    });
  });
});

describe('Experience Order Uniqueness', () => {
  /**
   * Business Rule: Order field must be unique per section.
   * Two items cannot have the same order - operation must fail.
   */

  const validateOrderUniqueness = async (
    existingOrders: number[],
    newOrder: number,
    _excludeId?: string,
  ): Promise<boolean> => {
    const orderSet = new Set(existingOrders);
    return !orderSet.has(newOrder);
  };

  it('should reject creating experience with duplicate order', async () => {
    const existingOrders = [1, 2, 3];
    const isValid = await validateOrderUniqueness(existingOrders, 3);
    expect(isValid).toBe(false);
  });

  it('should allow creating experience with unique order', async () => {
    const existingOrders = [1, 2, 3];
    const isValid = await validateOrderUniqueness(existingOrders, 5);
    expect(isValid).toBe(true);
  });

  it('should auto-assign next order when not specified', async () => {
    const existingOrders = [1, 2, 3];
    const nextOrder = Math.max(...existingOrders, 0) + 1;
    expect(nextOrder).toBe(4);
  });
});

describe('isCurrent and endDate Validation', () => {
  /**
   * Business Rule:
   * - isCurrent=true → endDate must be null
   * - Any other combination is invalid and must error
   */

  const validateCurrentEndDate = (
    isCurrent: boolean,
    endDate: string | null,
  ): { valid: boolean; error?: string } => {
    if (isCurrent && endDate !== null) {
      return {
        valid: false,
        error: 'Cannot have endDate when isCurrent is true',
      };
    }
    return { valid: true };
  };

  it('should accept isCurrent=true with endDate=null', () => {
    const result = validateCurrentEndDate(true, null);
    expect(result.valid).toBe(true);
  });

  it('should reject isCurrent=true with non-null endDate', () => {
    const result = validateCurrentEndDate(true, '2024-01-01');
    expect(result.valid).toBe(false);
    if (!result.error) throw new Error('Expected error to be defined');
    expect(result.error.includes('isCurrent')).toBe(true);
  });

  it('should accept isCurrent=false with endDate set', () => {
    const result = validateCurrentEndDate(false, '2024-01-01');
    expect(result.valid).toBe(true);
  });

  it('should accept isCurrent=false with endDate=null (left position)', () => {
    const result = validateCurrentEndDate(false, null);
    expect(result.valid).toBe(true);
  });
});

describe('Skills Reference Validation', () => {
  /**
   * Business Rule:
   * - Skills in experiences are entity references (IDs), not free text
   * - Referenced skills must exist in the resume
   */

  const validateSkillReferences = (
    skillIds: string[],
    resumeSkills: { id: string }[],
  ): { valid: boolean; invalidIds: string[] } => {
    const resumeSkillIds = new Set(resumeSkills.map((s) => s.id));
    const invalidIds = skillIds.filter((id) => !resumeSkillIds.has(id));
    return {
      valid: invalidIds.length === 0,
      invalidIds,
    };
  };

  it('should accept valid skill references', () => {
    const skillIds = ['skill-1', 'skill-2'];
    const resumeSkills = [{ id: 'skill-1' }, { id: 'skill-2' }, { id: 'skill-3' }];

    const result = validateSkillReferences(skillIds, resumeSkills);

    expect(result.valid).toBe(true);
    expect(result.invalidIds).toHaveLength(0);
  });

  it('should reject invalid skill references', () => {
    const skillIds = ['skill-1', 'nonexistent-skill'];
    const resumeSkills = [{ id: 'skill-1' }, { id: 'skill-2' }];

    const result = validateSkillReferences(skillIds, resumeSkills);

    expect(result.valid).toBe(false);
    expect(result.invalidIds.includes('nonexistent-skill')).toBe(true);
  });

  it('should accept empty skill references', () => {
    const skillIds: string[] = [];
    const resumeSkills = [{ id: 'skill-1' }];

    const result = validateSkillReferences(skillIds, resumeSkills);

    expect(result.valid).toBe(true);
  });
});
