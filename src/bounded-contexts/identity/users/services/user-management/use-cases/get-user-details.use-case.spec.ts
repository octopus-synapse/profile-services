/**
 * Unit tests for GetUserDetailsUseCase
 *
 * Uses In-Memory repository for clean, behavior-focused testing.
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { GetUserDetailsUseCase } from './get-user-details.use-case';
import { InMemoryUserManagementRepository } from '../../../../shared-kernel/testing';

describe('GetUserDetailsUseCase', () => {
  let useCase: GetUserDetailsUseCase;
  let repository: InMemoryUserManagementRepository;

  beforeEach(() => {
    repository = new InMemoryUserManagementRepository();
    useCase = new GetUserDetailsUseCase(repository as any);
  });

  it('should throw EntityNotFoundException when user not found', async () => {
    await expect(useCase.execute('user-123')).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('should return user details when user exists', async () => {
    repository.seedUser({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      resumes: [],
      counts: { accounts: 1, sessions: 2, resumes: 3 },
    });

    const result = await useCase.execute('user-123');

    expect(result.id).toBe('user-123');
    expect(result.email).toBe('test@example.com');
  });
});
