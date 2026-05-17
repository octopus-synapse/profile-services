/**
 * Delete Account Use Case Tests
 *
 * P0-#8 follow-up coverage: re-authentication via currentPassword is now
 * mandatory before the account is erased.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException, UnauthorizedException } from '@/shared-kernel/exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { DELETION_CONFIRMATION_PHRASE } from '../../../application/ports';
import { AccountDeletedEvent } from '../../../domain/events';
import { AccountDeletionRequiresConfirmationException } from '../../../domain/exceptions';
import type { PasswordHasherPort } from '../../../domain/ports/password-hasher.port';
import { createAccountData, InMemoryAccountLifecycleRepository } from '../../../testing';
import { DeleteAccountUseCase } from './delete-account.use-case';

const FAKE_HASH = '$bcrypt$stub';

class StubPasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === FAKE_HASH && plain === 'correct';
  }
}

describe('DeleteAccountUseCase', () => {
  let useCase: DeleteAccountUseCase;
  let repository: InMemoryAccountLifecycleRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryAccountLifecycleRepository();
    eventBus = new InMemoryEventBus();
    useCase = new DeleteAccountUseCase(repository, new StubPasswordHasher(), eventBus, stubLogger);
  });

  it('permanently deletes an account when phrase + password are correct', async () => {
    repository.seedAccount(createAccountData({ id: 'user-1', email: 'delete@example.com' }));
    repository.seedPasswordHash('user-1', FAKE_HASH);

    const result = await useCase.execute({
      userId: 'user-1',
      confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
      currentPassword: 'correct',
    });

    expect(result.success).toBe(true);
    const account = await repository.findById('user-1');
    expect(account).toBeNull();
  });

  it('publishes AccountDeletedEvent with user email', async () => {
    repository.seedAccount(createAccountData({ id: 'user-1', email: 'delete@example.com' }));
    repository.seedPasswordHash('user-1', FAKE_HASH);

    await useCase.execute({
      userId: 'user-1',
      confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
      currentPassword: 'correct',
    });

    expect(eventBus.hasPublished(AccountDeletedEvent)).toBe(true);
    const events = eventBus.getEventsByType(AccountDeletedEvent);
    expect(events).toHaveLength(1);
    expect(events[0].userId).toBe('user-1');
    expect(events[0].email).toBe('delete@example.com');
  });

  it('throws AccountDeletionRequiresConfirmationException for wrong phrase', async () => {
    repository.seedAccount(createAccountData({ id: 'user-1' }));
    repository.seedPasswordHash('user-1', FAKE_HASH);

    expect(
      useCase.execute({
        userId: 'user-1',
        confirmationPhrase: 'wrong phrase',
        currentPassword: 'correct',
      }),
    ).rejects.toThrow(AccountDeletionRequiresConfirmationException);
  });

  // P0-#8 follow-up regression: cookie-only attacker can't delete.
  it('throws UnauthorizedException when currentPassword is wrong', async () => {
    repository.seedAccount(createAccountData({ id: 'user-1' }));
    repository.seedPasswordHash('user-1', FAKE_HASH);

    expect(
      useCase.execute({
        userId: 'user-1',
        confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
        currentPassword: 'wrong',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when user has no password (OAuth-only)', async () => {
    repository.seedAccount(createAccountData({ id: 'user-oauth' }));
    // no seedPasswordHash → findPasswordHashById returns null

    expect(
      useCase.execute({
        userId: 'user-oauth',
        confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
        currentPassword: 'anything',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws EntityNotFoundException when account does not exist (with valid phrase + password gate seeded)', async () => {
    // To exercise the EntityNotFound branch we have to bypass the password
    // gate; the use-case checks password first, so simulate a phantom user
    // by seeding a hash for an id we never seeded as an account.
    repository.seedPasswordHash('nonexistent', FAKE_HASH);
    expect(
      useCase.execute({
        userId: 'nonexistent',
        confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
        currentPassword: 'correct',
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });

  it('does not delete account when confirmation phrase is wrong', async () => {
    repository.seedAccount(createAccountData({ id: 'user-1', email: 'keep@example.com' }));
    repository.seedPasswordHash('user-1', FAKE_HASH);

    try {
      await useCase.execute({
        userId: 'user-1',
        confirmationPhrase: 'wrong',
        currentPassword: 'correct',
      });
    } catch {
      // expected
    }

    const account = await repository.findById('user-1');
    expect(account).not.toBeNull();
  });

  it('does not publish events when password is wrong', async () => {
    repository.seedAccount(createAccountData({ id: 'user-1' }));
    repository.seedPasswordHash('user-1', FAKE_HASH);

    try {
      await useCase.execute({
        userId: 'user-1',
        confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
        currentPassword: 'wrong',
      });
    } catch {
      // expected
    }

    expect(eventBus.getPublishedEvents()).toHaveLength(0);
  });

  it('validates confirmation phrase before looking up account', async () => {
    expect(
      useCase.execute({
        userId: 'nonexistent',
        confirmationPhrase: 'wrong',
        currentPassword: 'correct',
      }),
    ).rejects.toThrow(AccountDeletionRequiresConfirmationException);
  });
});
