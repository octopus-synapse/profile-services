/**
 * Delete Account Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '../../../../shared-kernel/exceptions';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { DELETION_CONFIRMATION_PHRASE } from '../../../application/ports';
import { AccountDeletedEvent } from '../../../domain/events';
import { AccountDeletionRequiresConfirmationException } from '../../../domain/exceptions';
import {
  InMemoryAccountLifecycleRepository,
  createAccountData,
} from '../../../testing';
import { DeleteAccountUseCase } from './delete-account.use-case';

describe('DeleteAccountUseCase', () => {
  let useCase: DeleteAccountUseCase;
  let repository: InMemoryAccountLifecycleRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryAccountLifecycleRepository();
    eventBus = new InMemoryEventBus();

    useCase = new DeleteAccountUseCase(repository, eventBus);
  });

  it('should permanently delete an account', async () => {
    // Arrange
    repository.seedAccount(
      createAccountData({ id: 'user-1', email: 'delete@example.com' }),
    );

    // Act
    const result = await useCase.execute({
      userId: 'user-1',
      confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
    });

    // Assert
    expect(result.success).toBe(true);
    const account = await repository.findById('user-1');
    expect(account).toBeNull();
  });

  it('should publish AccountDeletedEvent with user email', async () => {
    // Arrange
    repository.seedAccount(
      createAccountData({ id: 'user-1', email: 'delete@example.com' }),
    );

    // Act
    await useCase.execute({
      userId: 'user-1',
      confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
    });

    // Assert
    expect(eventBus.hasPublished(AccountDeletedEvent)).toBe(true);
    const events = eventBus.getEventsByType(AccountDeletedEvent);
    expect(events).toHaveLength(1);
    expect(events[0].userId).toBe('user-1');
    expect(events[0].email).toBe('delete@example.com');
  });

  it('should throw AccountDeletionRequiresConfirmationException for wrong phrase', async () => {
    // Arrange
    repository.seedAccount(createAccountData({ id: 'user-1' }));

    // Act & Assert
    expect(
      useCase.execute({
        userId: 'user-1',
        confirmationPhrase: 'wrong phrase',
      }),
    ).rejects.toThrow(AccountDeletionRequiresConfirmationException);
  });

  it('should throw EntityNotFoundException when account does not exist', async () => {
    // Act & Assert
    expect(
      useCase.execute({
        userId: 'nonexistent',
        confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });

  it('should not delete account when confirmation phrase is wrong', async () => {
    // Arrange
    repository.seedAccount(
      createAccountData({ id: 'user-1', email: 'keep@example.com' }),
    );

    // Act
    try {
      await useCase.execute({
        userId: 'user-1',
        confirmationPhrase: 'wrong',
      });
    } catch {
      // expected
    }

    // Assert
    const account = await repository.findById('user-1');
    expect(account).not.toBeNull();
  });

  it('should not publish events when confirmation phrase is wrong', async () => {
    // Arrange
    repository.seedAccount(createAccountData({ id: 'user-1' }));

    // Act
    try {
      await useCase.execute({
        userId: 'user-1',
        confirmationPhrase: 'wrong',
      });
    } catch {
      // expected
    }

    // Assert
    expect(eventBus.getPublishedEvents()).toHaveLength(0);
  });

  it('should not publish events when account is not found', async () => {
    // Act
    try {
      await useCase.execute({
        userId: 'nonexistent',
        confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
      });
    } catch {
      // expected
    }

    // Assert
    expect(eventBus.getPublishedEvents()).toHaveLength(0);
  });

  it('should validate confirmation phrase before looking up account', async () => {
    // Act & Assert - wrong phrase should throw even if account doesn't exist
    expect(
      useCase.execute({
        userId: 'nonexistent',
        confirmationPhrase: 'wrong',
      }),
    ).rejects.toThrow(AccountDeletionRequiresConfirmationException);
  });
});
