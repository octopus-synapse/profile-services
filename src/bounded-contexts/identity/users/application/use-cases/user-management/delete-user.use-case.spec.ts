/**
 * Unit tests for DeleteUserUseCase
 *
 * Uses In-Memory repository for clean, behavior-focused testing.
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException, ForbiddenException } from '@/shared-kernel/exceptions';
import { InMemoryUserManagementRepository } from '../../../../shared-kernel/testing';
import { DeleteUserUseCase } from './delete-user.use-case';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let repository: InMemoryUserManagementRepository;

  beforeEach(() => {
    repository = new InMemoryUserManagementRepository();
    useCase = new DeleteUserUseCase(repository);
  });

  it('should throw EntityNotFoundException when user not found', async () => {
    await expect(useCase.execute('user-123', 'admin-456')).rejects.toThrow(EntityNotFoundException);
  });

  it('should throw ForbiddenException when trying to delete self', async () => {
    repository.seedUser({ id: 'user-123' });

    await expect(useCase.execute('user-123', 'user-123')).rejects.toThrow(ForbiddenException);
  });

  it('should delete user when valid', async () => {
    repository.seedUser({ id: 'user-123' });

    await useCase.execute('user-123', 'admin-456');

    expect(repository.getUser('user-123')).toBeUndefined();
  });
});
