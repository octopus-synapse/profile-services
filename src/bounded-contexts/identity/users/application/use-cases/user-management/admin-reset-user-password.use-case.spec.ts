/**
 * Unit tests for AdminResetUserPasswordUseCase
 *
 * Uses In-Memory repository for clean, behavior-focused testing.
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InMemoryUserManagementRepository,
  StubHashService,
} from '../../../../shared-kernel/testing';
import { AdminResetUserPasswordUseCase } from './admin-reset-user-password.use-case';

describe('AdminResetUserPasswordUseCase', () => {
  let useCase: AdminResetUserPasswordUseCase;
  let repository: InMemoryUserManagementRepository;
  let hashService: StubHashService;

  beforeEach(() => {
    repository = new InMemoryUserManagementRepository();
    hashService = new StubHashService();
    useCase = new AdminResetUserPasswordUseCase(
      repository,
      (password: string) => hashService.hash(password),
      stubLogger,
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
