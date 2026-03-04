/**
 * Unit tests for ListUsersUseCase
 *
 * Uses In-Memory repository for clean, behavior-focused testing.
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import { ListUsersUseCase } from './list-users.use-case';
import { InMemoryUserManagementRepository } from '../../../../shared-kernel/testing';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let repository: InMemoryUserManagementRepository;

  beforeEach(() => {
    repository = new InMemoryUserManagementRepository();
    useCase = new ListUsersUseCase(repository as any);
  });

  it('should return paginated users list', async () => {
    // Seed 10 users
    for (let i = 1; i <= 10; i++) {
      repository.seedUser({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
      });
    }

    const result = await useCase.execute({ page: 1, limit: 2 });

    expect(result.users.length).toBe(2);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 10,
      totalPages: 5,
    });
  });

  it('should calculate totalPages correctly', async () => {
    // Seed 15 users
    for (let i = 1; i <= 15; i++) {
      repository.seedUser({ id: `user-${i}`, email: `user${i}@test.com` });
    }

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.pagination.totalPages).toBe(2);
  });
});
