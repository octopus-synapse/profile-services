/**
 * Identify Account Use Case Tests
 *
 * Uses the in-memory account-lifecycle repository for behavior-focused
 * testing of the identifier-first entry point. Covers the four branches
 * the client renders: sign-up, resume-verification, OAuth-only, sign-in.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryAccountLifecycleRepository } from '../../../testing';
import { IdentifyAccountUseCase } from './identify-account.use-case';

describe('IdentifyAccountUseCase', () => {
  let repository: InMemoryAccountLifecycleRepository;
  let useCase: IdentifyAccountUseCase;

  beforeEach(() => {
    repository = new InMemoryAccountLifecycleRepository();
    useCase = new IdentifyAccountUseCase(repository);
  });

  async function seedAccount(email: string): Promise<string> {
    const account = await repository.create({
      name: 'Camila Ribeiro',
      email,
      passwordHash: 'bcrypt-hash',
    });
    return account.id;
  }

  it('reports exists=false (and nothing else) for an e-mail with no account', async () => {
    const result = await useCase.execute({ email: 'nobody@example.com' });
    expect(result).toEqual({ exists: false });
  });

  it('reports an unverified password account (client resumes verification)', async () => {
    await seedAccount('camila@example.com');

    const result = await useCase.execute({ email: 'camila@example.com' });
    expect(result).toEqual({ exists: true, emailVerified: false, hasPassword: true });
  });

  it('reports a verified password account (client shows the password step)', async () => {
    const userId = await seedAccount('camila@example.com');
    repository.markEmailVerified(userId);

    const result = await useCase.execute({ email: 'camila@example.com' });
    expect(result).toEqual({ exists: true, emailVerified: true, hasPassword: true });
  });

  it('reports an OAuth-only account (client points at the social button)', async () => {
    const userId = await seedAccount('camila@example.com');
    repository.markEmailVerified(userId);
    repository.removePasswordHash(userId);

    const result = await useCase.execute({ email: 'camila@example.com' });
    expect(result).toEqual({ exists: true, emailVerified: true, hasPassword: false });
  });

  it('leaks no account data beyond the three routing signals', async () => {
    await seedAccount('camila@example.com');

    const result = await useCase.execute({ email: 'camila@example.com' });
    expect(Object.keys(result).sort()).toEqual(['emailVerified', 'exists', 'hasPassword']);
  });
});
