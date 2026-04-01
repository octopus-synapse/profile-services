/**
 * Username Service (Facade) Tests
 *
 * Tests the facade pattern, verifying delegation to use cases.
 * Uses In-Memory repositories and Stubs for clean, behavior-focused testing.
 *
 * Uncle Bob: "Test the system, not your imagination of the system."
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  InMemoryUsersRepository,
  StubLogger,
} from '@/bounded-contexts/identity/shared-kernel/testing';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { UsersRepository } from '../../infrastructure/adapters/persistence/users.repository';
import {
  type UpdatedUsername,
  USERNAME_USE_CASES,
  type UsernameUseCases,
} from '../ports/username.port';
import { UsernameService } from './username.service';

describe('UsernameService (Facade)', () => {
  let service: UsernameService;
  let mockUseCases: UsernameUseCases;
  let usersRepository: InMemoryUsersRepository;
  let logger: StubLogger;

  const mockUpdatedUsername: UpdatedUsername = {
    username: 'newuser',
  };

  beforeEach(async () => {
    mockUseCases = {
      updateUsernameUseCase: {
        execute: mock(async () => mockUpdatedUsername),
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

  describe('updateUsername', () => {
    it('should delegate to updateUsernameUseCase', async () => {
      const result = await service.updateUsername('user-123', {
        username: 'newuser',
      });

      expect(result).toEqual(mockUpdatedUsername);
      expect(mockUseCases.updateUsernameUseCase.execute).toHaveBeenCalledWith(
        'user-123',
        'newuser',
      );
    });

    it('should log the username update', async () => {
      await service.updateUsername('user-123', { username: 'newuser' });

      expect(logger.hasLogged('Username updated', 'debug')).toBe(true);
      const lastLog = logger.getLastLog();
      expect(lastLog?.meta).toEqual({
        userId: 'user-123',
        newUsername: 'newuser',
      });
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return available=true when not taken', async () => {
      const result = await service.checkUsernameAvailability('newuser');

      expect(result.available).toBe(true);
      expect(result.username).toBe('newuser');
    });

    it('should return available=false when taken', async () => {
      usersRepository.markUsernameTaken('takenuser');

      const result = await service.checkUsernameAvailability('takenuser');

      expect(result.available).toBe(false);
    });

    it('should normalize username to lowercase', async () => {
      usersRepository.markUsernameTaken('testuser');

      const result = await service.checkUsernameAvailability('TestUser');

      expect(result.available).toBe(false);
      expect(result.username).toBe('testuser');
    });

    it('should exclude user when checking their own username', async () => {
      usersRepository.seedUser({ id: 'user-123', username: 'testuser' });

      const result = await service.checkUsernameAvailability('testuser', 'user-123');

      expect(result.available).toBe(true);
    });
  });

  describe('validateUsername', () => {
    it('should validate and return valid=true for good username', async () => {
      const result = await service.validateUsername('validuser');

      expect(result.valid).toBe(true);
      expect(result.available).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject uppercase letters', async () => {
      const result = await service.validateUsername('TestUser');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'UPPERCASE')).toBe(true);
    });

    it('should reject usernames starting with number', async () => {
      const result = await service.validateUsername('123user');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_START')).toBe(true);
    });

    it('should reject special characters', async () => {
      const result = await service.validateUsername('user@name');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should reject consecutive underscores', async () => {
      const result = await service.validateUsername('user__name');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CONSECUTIVE_UNDERSCORES')).toBe(true);
    });

    it('should reject trailing underscore', async () => {
      const result = await service.validateUsername('username_');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_END')).toBe(true);
    });

    it('should reject reserved usernames', async () => {
      const reserved = ['admin', 'api', 'www', 'support', 'root'];

      for (const name of reserved) {
        const result = await service.validateUsername(name);
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'RESERVED'),
          `Expected "${name}" to be rejected as reserved`,
        ).toBe(true);
      }
    });

    it('should accept valid usernames', async () => {
      const validNames = ['validuser', 'user123', 'user_name'];

      for (const name of validNames) {
        const result = await service.validateUsername(name);
        expect(result.valid, `Expected "${name}" to be valid`).toBe(true);
      }
    });

    it('should check availability when format is valid', async () => {
      usersRepository.markUsernameTaken('takenuser');

      const result = await service.validateUsername('takenuser');

      expect(result.valid).toBe(false);
      expect(result.available).toBe(false);
      expect(result.errors.some((e) => e.code === 'ALREADY_TAKEN')).toBe(true);
    });

    it('should not check availability when format is invalid', async () => {
      const result = await service.validateUsername('UPPERCASE');

      expect(result.available).toBeUndefined();
    });
  });
});
