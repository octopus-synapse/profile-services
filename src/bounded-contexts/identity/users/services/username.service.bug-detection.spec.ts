/**
 * Username Service Bug Detection Tests
 *
 * These tests are written from SPECIFICATIONS, not from implementation.
 * They test what the system SHOULD do, not what it currently DOES.
 *
 * Uncle Bob: "A test that passes when it should fail is worse than no test at all."
 *
 * EXPECTED: Some tests will FAIL - that's the point. They expose bugs.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsernameService } from './username.service';
import { UsersRepository } from '@/bounded-contexts/identity/users/users.repository';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';

describe('UsernameService - Bug Detection', () => {
  let service: UsernameService;
  let mockUsersRepository: UsersRepository;

  const mockUser = {
    id: 'user-123',
    username: 'existinguser',
    email: 'test@example.com',
    usernameUpdatedAt: null,
  };

  beforeEach(async () => {
    mockUsersRepository = {
      findUserById: mock().mockResolvedValue(mockUser),
      updateUsername: mock().mockResolvedValue({
        ...mockUser,
        username: 'newuser',
      }),
      isUsernameTaken: mock().mockResolvedValue(false),
      findLastUsernameUpdateByUserId: mock().mockResolvedValue(null),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsernameService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        {
          provide: AppLoggerService,
          useValue: { debug: mock(), warn: mock() },
        },
      ],
    }).compile();

    service = module.get<UsernameService>(UsernameService);
  });

  /**
   * BUG #1: Username with uppercase should be REJECTED, not converted
   *
   * Business Rule: "Usernames with uppercase are rejected, not converted automatically.
   *                 Implicit conversion is FORBIDDEN."
   *
   * Current behavior: Converts to lowercase silently
   * Expected behavior: Throw BadRequestException
   */
  describe('BUG #1: Uppercase usernames must be REJECTED', () => {
    it('should REJECT username containing uppercase letters', async () => {
      // This test EXPOSES the bug: current code converts instead of rejecting
      await expect(
        service.updateUsername('user-123', { username: 'TestUser' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT username with mixed case', async () => {
      await expect(
        service.updateUsername('user-123', { username: 'myUserName123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT username with single uppercase letter', async () => {
      await expect(
        service.updateUsername('user-123', { username: 'Username' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ACCEPT only lowercase username', async () => {
      // This should pass
      const result = await service.updateUsername('user-123', {
        username: 'validusername',
      });
      expect(result.success).toBe(true);
    });
  });

  /**
   * BUG #2: Reserved usernames must be REJECTED
   *
   * Business Rule: "Reserved usernames (admin, api, www, support) should be rejected.
   *                 The list must be configurable and auditable."
   *
   * Current behavior: No validation exists
   * Expected behavior: Throw BadRequestException for reserved usernames
   */
  describe('BUG #2: Reserved usernames must be REJECTED', () => {
    const reservedUsernames = [
      'admin',
      'api',
      'www',
      'support',
      'help',
      'root',
      'system',
      'null',
      'undefined',
    ];

    reservedUsernames.forEach((username) => {
      it(`should REJECT reserved username: "${username}"`, async () => {
        await expect(
          service.updateUsername('user-123', { username }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    it('should include "reserved" in error message', async () => {
      try {
        await service.updateUsername('user-123', { username: 'admin' });
        fail('Should have thrown an exception');
      } catch (error) {
        expect((error as Error).message.toLowerCase()).toInclude('reserved');
      }
    });
  });

  /**
   * BUG #3: Username format validation
   *
   * Business Rules:
   * - Only lowercase letters, numbers, underscores allowed
   * - Must start with a letter
   * - No consecutive underscores
   * - No trailing underscores
   */
  describe('BUG #3: Username format validation', () => {
    it('should REJECT username starting with number', async () => {
      await expect(
        service.updateUsername('user-123', { username: '123user' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT username with special characters', async () => {
      await expect(
        service.updateUsername('user-123', { username: 'user@name' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT username with spaces', async () => {
      await expect(
        service.updateUsername('user-123', { username: 'user name' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT username with consecutive underscores', async () => {
      await expect(
        service.updateUsername('user-123', { username: 'user__name' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT username ending with underscore', async () => {
      await expect(
        service.updateUsername('user-123', { username: 'username_' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /**
   * Cooldown Validation - Edge Cases
   *
   * These tests verify boundary conditions that are easy to get wrong
   */
  describe('Cooldown edge cases', () => {
    it('should REJECT at exactly 29 days (boundary test)', async () => {
      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      mockUsersRepository.findLastUsernameUpdateByUserId.mockResolvedValue(
        twentyNineDaysAgo,
      );

      await expect(
        service.updateUsername('user-123', { username: 'newuser' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ACCEPT at exactly 30 days (boundary test)', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      mockUsersRepository.findLastUsernameUpdateByUserId.mockResolvedValue(
        thirtyDaysAgo,
      );

      const result = await service.updateUsername('user-123', {
        username: 'newuser',
      });
      expect(result.success).toBe(true);
    });

    it('should show correct remaining days in error message', async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      mockUsersRepository.findLastUsernameUpdateByUserId.mockResolvedValue(
        twentyDaysAgo,
      );

      try {
        await service.updateUsername('user-123', { username: 'newuser' });
        fail('Should have thrown');
      } catch (error) {
        // Should say 10 days remaining (30 - 20 = 10)
        expect((error as Error).message).toInclude('10');
      }
    });
  });
});
