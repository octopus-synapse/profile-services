/**
 * Username Service Bug Detection Tests
 *
 * These tests verify username validation rules using the validateUsername method.
 * Tests format validation, reserved usernames, and availability checks.
 *
 * Uncle Bob: "A test that passes when it should fail is worse than no test at all."
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { InMemoryUsersRepository, StubLogger } from '../../shared-kernel/testing';
import { UsersRepository } from '../users.repository';
import { USERNAME_USE_CASES, type UsernameUseCases } from './username/ports/username.port';
import { UsernameService } from './username.service';

describe('UsernameService - Bug Detection', () => {
  let service: UsernameService;
  let usersRepository: InMemoryUsersRepository;
  let logger: StubLogger;

  beforeEach(async () => {
    const mockUseCases: UsernameUseCases = {
      updateUsernameUseCase: {
        execute: mock(async () => ({ username: 'newuser' })),
      },
    };

    usersRepository = new InMemoryUsersRepository();
    logger = new StubLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsernameService,
        { provide: USERNAME_USE_CASES, useValue: mockUseCases },
        { provide: UsersRepository, useValue: usersRepository },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<UsernameService>(UsernameService);
  });

  /**
   * BUG #1: Username with uppercase should be REJECTED
   *
   * Business Rule: "Usernames with uppercase are rejected, not converted automatically."
   */
  describe('BUG #1: Uppercase usernames must be REJECTED', () => {
    it('should REJECT username containing uppercase letters', async () => {
      const result = await service.validateUsername('TestUser');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'UPPERCASE')).toBe(true);
    });

    it('should REJECT username with mixed case', async () => {
      const result = await service.validateUsername('myUserName123');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'UPPERCASE')).toBe(true);
    });

    it('should REJECT username with single uppercase letter', async () => {
      const result = await service.validateUsername('Username');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'UPPERCASE')).toBe(true);
    });

    it('should ACCEPT only lowercase username', async () => {
      const result = await service.validateUsername('validusername');
      expect(result.valid).toBe(true);
    });
  });

  /**
   * BUG #2: Reserved usernames must be REJECTED
   *
   * Business Rule: "Reserved usernames (admin, api, www, support) should be rejected."
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
        const result = await service.validateUsername(username);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'RESERVED')).toBe(true);
      });
    });

    it('should include "reserved" in error message', async () => {
      const result = await service.validateUsername('admin');
      const reservedError = result.errors.find((e) => e.code === 'RESERVED');
      expect(reservedError?.message.toLowerCase()).toInclude('reserved');
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
      const result = await service.validateUsername('123user');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_START')).toBe(true);
    });

    it('should REJECT username with special characters', async () => {
      const result = await service.validateUsername('user@name');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should REJECT username with spaces', async () => {
      const result = await service.validateUsername('user name');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should REJECT username with consecutive underscores', async () => {
      const result = await service.validateUsername('user__name');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CONSECUTIVE_UNDERSCORES')).toBe(true);
    });

    it('should REJECT username ending with underscore', async () => {
      const result = await service.validateUsername('username_');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_END')).toBe(true);
    });
  });

  /**
   * Availability checks
   */
  describe('Username availability', () => {
    it('should mark username as unavailable when taken', async () => {
      usersRepository.markUsernameTaken('takenuser');

      const result = await service.validateUsername('takenuser');
      expect(result.valid).toBe(false);
      expect(result.available).toBe(false);
      expect(result.errors.some((e) => e.code === 'ALREADY_TAKEN')).toBe(true);
    });

    it('should mark username as available when not taken', async () => {
      const result = await service.validateUsername('availableuser');
      expect(result.valid).toBe(true);
      expect(result.available).toBe(true);
    });
  });
});
