/**
 * Race Condition Bug Detection Tests
 *
 * Uncle Bob (sem café): "TOCTOU! Time-Of-Check-To-Time-Of-Use!
 * O check e a ação não são atômicos! RACE CONDITION!"
 *
 * BUG-001: Race Condition - Email uniqueness check
 * BUG-002: Race Condition - Username uniqueness check
 * BUG-003: Race Condition - Resume limit check
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UserAdminMutationService } from './user-admin-mutation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../../auth/services/password.service';

describe('Race Condition Bug Detection', () => {
  let service: UserAdminMutationService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAdminMutationService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: PasswordService,
          useValue: { hash: jest.fn().mockResolvedValue('hashed') },
        },
      ],
    }).compile();

    service = module.get<UserAdminMutationService>(UserAdminMutationService);
  });

  describe('BUG-001: Email Uniqueness Race Condition', () => {
    /**
     * CRITICAL: TOCTOU Vulnerability!
     *
     * Current flow (vulnerable):
     * 1. Check if email exists → false
     * 2. (WINDOW: Another request creates same email)
     * 3. Create user → Duplicate or error!
     *
     * Secure flow:
     * 1. Use transaction with unique constraint
     * 2. OR use SELECT FOR UPDATE
     * 3. Handle unique constraint violation
     */
    it('should use transaction to prevent race condition', async () => {
      const createDto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        ...createDto,
        role: 'USER',
      });

      await service.create(createDto);

      // BUG: The operation is NOT using a transaction!
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle unique constraint violation gracefully', async () => {
      const createDto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      // First check says email doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // But creation fails due to race condition (another request created it)
      mockPrisma.user.create.mockRejectedValue({
        code: 'P2002', // Prisma unique constraint violation
        meta: { target: ['email'] },
      });

      // BUG: Should catch P2002 and throw ConflictException
      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should NOT use separate check and create operations', async () => {
      const createDto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'user-1', ...createDto });

      await service.create(createDto);

      // BUG: Two separate calls = race condition window!
      // The findUnique and create should be in same transaction
      // OR just try to create and handle unique violation

      const findUniqueCalls = mockPrisma.user.findUnique.mock.calls.length;
      const createCalls = mockPrisma.user.create.mock.calls.length;

      // If we're doing separate check-then-create, this is a bug!
      if (findUniqueCalls > 0 && createCalls > 0) {
        // They should be in a transaction or we should skip the check
        expect(mockPrisma.$transaction).toHaveBeenCalled();
      }
    });
  });

  describe('Atomic Operations Pattern', () => {
    /**
     * Recommended patterns for preventing race conditions:
     */

    it('Pattern 1: Try create, catch unique violation', async () => {
      // Best pattern: Just try to create and handle the error
      // This eliminates the race condition entirely

      const createDto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      // Should try to create first without checking
      mockPrisma.user.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      // And convert P2002 to ConflictException
      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('Pattern 2: Transaction with serializable isolation', async () => {
      // Alternative: Use transaction with proper isolation level

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      // The transaction should be called with SERIALIZABLE isolation
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
        }),
      );
    });
  });
});
