/**
 * Unit tests for ResetPasswordUseCase
 *
 * Uses In-Memory repository for clean, behavior-focused testing.
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import {
  InMemoryUserManagementRepository,
  StubHashService,
} from '../../../../shared-kernel/testing';
import { ResetPasswordUseCase } from './reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let repository: InMemoryUserManagementRepository;
  let hashService: StubHashService;

  beforeEach(() => {
    repository = new InMemoryUserManagementRepository();
    hashService = new StubHashService();
    useCase = new ResetPasswordUseCase(repository, (password: string) =>
      hashService.hash(password),
    );
  });

  it('should throw EntityNotFoundException when user not found', async () => {
    await expect(useCase.execute('user-123', 'newPassword')).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('should hash password and save when user exists', async () => {
    repository.seedUser({ id: 'user-123', passwordHash: 'old-hashed' });

    await useCase.execute('user-123', 'newPassword');

    const user = repository.getUser('user-123');
    expect(user?.passwordHash).toBe('hashed_newPassword');
  });
});
