import { beforeEach, describe, expect, it } from 'bun:test';
import { CreateUserUseCase } from './create-user.use-case';
import { InMemoryUserManagementRepository } from '../../../../shared-kernel/testing';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let repository: InMemoryUserManagementRepository;

  beforeEach(() => {
    repository = new InMemoryUserManagementRepository();
    useCase = new CreateUserUseCase(
      repository as any,
      async (password: string) => `hashed_${password}`,
    );
  });

  it('creates user and returns domain entity (not envelope)', async () => {
    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(result.email).toBe('test@example.com');
    expect(result.name).toBe('Test User');
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);

    const createdUser = repository.getUser(result.id);
    expect(createdUser?.passwordHash).toBe('hashed_password123');

    // CRITICAL: No envelope fields
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('message');
  });
});
