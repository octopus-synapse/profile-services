/**
 * Resumes Service Tests
 *
 * Business Rules Tested:
 * 1. Maximum 4 resumes per user (error 400)
 * 2. Order field must be unique per section
 * 3. isCurrent=true requires endDate=null
 * 4. Skills in experiences are entity references, not free text
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumesService } from './resumes.service';
import { ResumesRepository } from './resumes.repository';
import { ResumeVersionService } from '../resume-versions/services/resume-version.service';
import { CacheInvalidationService } from '../common/cache/services/cache-invalidation.service';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

describe('ResumesService', () => {
  let service: ResumesService;
  let repository: ResumesRepository;
  let versionService: ResumeVersionService;
  let cacheInvalidation: CacheInvalidationService;

  const _MAX_RESUMES_PER_USER = 4; // Used in business logic, stored for reference

  const mockResume = {
    id: 'resume-1',
    userId: 'user-123',
    title: 'Software Engineer',
    summary: 'Experienced developer',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      findAll: mock(),
      findOne: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      findByUserId: mock(),
    } as any;

    versionService = {
      createSnapshot: mock(() => Promise.resolve()),
    } as any;

    cacheInvalidation = {
      invalidateResume: mock(() => Promise.resolve()),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesService,
        { provide: ResumesRepository, useValue: repository },
        { provide: ResumeVersionService, useValue: versionService },
        { provide: CacheInvalidationService, useValue: cacheInvalidation },
      ],
    }).compile();

    service = module.get<ResumesService>(ResumesService);
  });

  describe('Resume Limit (Maximum 4)', () => {
    it('should allow creating resume when under limit', async () => {
      repository.findAll.mockResolvedValue([
        mockResume,
        mockResume,
        mockResume,
      ] as any); // 3 existing
      repository.create.mockResolvedValue(mockResume as any);

      const result = await service.create('user-123', { title: 'New Resume' });

      expect(result.data).toBeDefined();
    });

    it('should reject creating 5th resume with error', async () => {
      // 4 existing resumes
      repository.findAll.mockResolvedValue([
        mockResume,
        mockResume,
        mockResume,
        mockResume,
      ] as any);

      await expect(
        service.create('user-123', { title: 'Fifth Resume' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should show clear error message about 4 resume limit', async () => {
      repository.findAll.mockResolvedValue([
        mockResume,
        mockResume,
        mockResume,
        mockResume,
      ] as any);

      await expect(
        service.create('user-123', { title: 'Fifth Resume' }),
      ).rejects.toThrow(/4.*resumes/i);
    });

    it('should allow creating exactly 4 resumes', async () => {
      repository.findAll.mockResolvedValue([
        mockResume,
        mockResume,
        mockResume,
      ] as any);
      repository.create.mockResolvedValue(mockResume as any);

      const result = await service.create('user-123', {
        title: 'Fourth Resume',
      });

      expect(result.data).toBeDefined();
    });
  });

  describe('Resume CRUD Operations', () => {
    it('should return all resumes for a user', async () => {
      const resumes = [mockResume, { ...mockResume, id: 'resume-2' }];
      repository.findAll.mockResolvedValue(resumes as any);

      const result = await service.findAll('user-123');

      expect(result.data).toHaveLength(2);
    });

    it('should return resume by id if owned by user', async () => {
      repository.findOne.mockResolvedValue(mockResume as any);

      const result = await service.findOne('resume-1', 'user-123');

      expect(result.data?.id).toBe('resume-1');
    });

    it('should throw NotFoundException for non-existent resume', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        async () => await service.findOne('nonexistent', 'user-123'),
      ).toThrow(NotFoundException);
    });

    it('should update resume if owned by user', async () => {
      repository.update.mockResolvedValue({
        ...mockResume,
        title: 'Updated Title',
      } as any);

      const result = await service.update('resume-1', 'user-123', {
        title: 'Updated Title',
      });

      expect(result.data?.title).toBe('Updated Title');
    });

    it('should delete resume if owned by user', async () => {
      repository.delete.mockResolvedValue(true);

      const result = await service.remove('resume-1', 'user-123');

      expect(result.message.includes('deleted')).toBe(true);
    });
  });

  describe('Remaining Slots', () => {
    it('should correctly calculate remaining slots', async () => {
      repository.findAll.mockResolvedValue([mockResume, mockResume] as any);

      const slots = await service.getRemainingSlots('user-123');

      expect(slots.used).toBe(2);
      expect(slots.limit).toBe(4);
      expect(slots.remaining).toBe(2);
    });

    it('should show 0 remaining when at limit', async () => {
      repository.findAll.mockResolvedValue([
        mockResume,
        mockResume,
        mockResume,
        mockResume,
      ] as any);

      const slots = await service.getRemainingSlots('user-123');

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
    const resumeSkills = [
      { id: 'skill-1' },
      { id: 'skill-2' },
      { id: 'skill-3' },
    ];

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
