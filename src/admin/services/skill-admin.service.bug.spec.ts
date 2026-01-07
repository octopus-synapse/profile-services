/**
 * Skill Admin Service Bug Detection Tests
 *
 * Uncle Bob: "Race condition NO ORDER! Sem audit log! SEM AUTORIZAÇÃO!"
 *
 * BUG-034: Race Condition - Skill Order Assignment
 * BUG-041: No Audit Log for Skill Admin Operations
 * BUG-044: SkillAdmin Delete Has No Authorization Check
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SkillAdminService } from './skill-admin.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SkillAdminService - BUG DETECTION', () => {
  let service: SkillAdminService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      resume: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'resume-1', userId: 'user-1' }),
      },
      skill: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillAdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SkillAdminService>(SkillAdminService);
  });

  describe('BUG-034: Order Assignment Race Condition', () => {
    /**
     * Race condition in getNextOrder:
     * 1. Request A: getNextOrder → returns 5
     * 2. Request B: getNextOrder → returns 5 (same!)
     * 3. Both create with order 5 → duplicate orders!
     */
    it('should use transaction for order assignment', async () => {
      mockPrisma.skill.findFirst.mockResolvedValue({ order: 4 });
      mockPrisma.skill.create.mockResolvedValue({
        id: 'skill-1',
        name: 'TypeScript',
        order: 5,
      });

      await service.addToResume('resume-1', {
        name: 'TypeScript',
        category: 'Programming',
      });

      // BUG: Should use transaction to prevent race condition!
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle concurrent skill additions without duplicate orders', async () => {
      // Simulate race condition scenario
      mockPrisma.skill.findFirst
        .mockResolvedValueOnce({ order: 4 }) // First request sees order 4
        .mockResolvedValueOnce({ order: 4 }); // Second also sees order 4

      mockPrisma.skill.create
        .mockResolvedValueOnce({ id: 'skill-1', order: 5 })
        .mockResolvedValueOnce({ id: 'skill-2', order: 5 }); // Same order!

      // Execute concurrently
      const results = await Promise.all([
        service.addToResume('resume-1', {
          name: 'TypeScript',
          category: 'Lang',
        }),
        service.addToResume('resume-1', {
          name: 'JavaScript',
          category: 'Lang',
        }),
      ]);

      // BUG: Both got order 5! One should be 6
      const orders = [
        (results[0] as any).skill.order,
        (results[1] as any).skill.order,
      ];

      // Should have unique orders
      expect(new Set(orders).size).toBe(2);
    });
  });

  describe('BUG-041: No Audit Log', () => {
    /**
     * Admin operations should be audited!
     */
    it('should create audit log when adding skill', async () => {
      mockPrisma.skill.findFirst.mockResolvedValue(null);
      mockPrisma.skill.create.mockResolvedValue({
        id: 'skill-1',
        name: 'TypeScript',
        order: 0,
      });

      await service.addToResume('resume-1', {
        name: 'TypeScript',
        category: 'Programming',
      });

      // BUG: No audit log created!
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: expect.stringMatching(/SKILL_CREATED|CREATE_SKILL/i),
          }),
        }),
      );
    });

    it('should create audit log when deleting skill', async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: 'skill-1' });
      mockPrisma.skill.delete.mockResolvedValue({ id: 'skill-1' });

      await service.delete('skill-1');

      // BUG: No audit log created!
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: expect.stringMatching(/SKILL_DELETED|DELETE_SKILL/i),
          }),
        }),
      );
    });
  });

  describe('BUG-044: No Authorization Check on Delete', () => {
    /**
     * Any admin can delete any skill!
     * Should check if admin has permission for this resource.
     */
    it('should check admin authorization before delete', async () => {
      // Skill belongs to user-1's resume
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: 'skill-1',
        resumeId: 'resume-1',
      });
      mockPrisma.resume.findUnique.mockResolvedValue({
        id: 'resume-1',
        userId: 'user-1',
      });
      mockPrisma.skill.delete.mockResolvedValue({ id: 'skill-1' });

      // BUG: No adminId parameter to check authorization!
      // Currently: service.delete('skill-1')
      // Should be: service.delete('skill-1', 'admin-123')
      // And should check if admin has permission

      await service.delete('skill-1');

      // Should verify admin permissions before delete
      // Currently just checks skill exists
    });
  });
});
