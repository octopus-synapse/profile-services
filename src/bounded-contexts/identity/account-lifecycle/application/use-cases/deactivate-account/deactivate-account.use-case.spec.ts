/**
 * Deactivate Account Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '../../../../shared-kernel/exceptions';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { AccountDeactivatedEvent } from '../../../domain/events';
import { AccountDeactivatedException } from '../../../domain/exceptions';
import {
  InMemoryAccountLifecycleRepository,
  createAccountData,
} from '../../../testing';
import { DeactivateAccountUseCase } from './deactivate-account.use-case';

describe('DeactivateAccountUseCase', () => {
  let useCase: DeactivateAccountUseCase;
  let repository: InMemoryAccountLifecycleRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryAccountLifecycleRepository();
    eventBus = new InMemoryEventBus();

    useCase = new DeactivateAccountUseCase(repository, eventBus);
  });

  it('should deactivate an active account', async () => {
    // Arrange
    repository.seedAccount(createAccountData({ id: 'user-1', isActive: true }));

    // Act
    const result = await useCase.execute({ userId: 'user-1' });

    // Assert
    expect(result.success).toBe(true);
    const account = await repository.findById('user-1');
    expect(account!.isActive).toBe(false);
  });

  it('should publish AccountDeactivatedEvent', async () => {
    // Arrange
    repository.seedAccount(createAccountData({ id: 'user-1', isActive: true }));

    // Act
    await useCase.execute({ userId: 'user-1', reason: 'User requested' });

    // Assert
    expect(eventBus.hasPublished(AccountDeactivatedEvent)).toBe(true);
    const events = eventBus.getEventsByType(AccountDeactivatedEvent);
    expect(events).toHaveLength(1);
    expect(events[0].userId).toBe('user-1');
    expect(events[0].reason).toBe('User requested');
  });

  it('should publish event without reason when not provided', async () => {
    // Arrange
    repository.seedAccount(createAccountData({ id: 'user-1', isActive: true }));

    // Act
    await useCase.execute({ userId: 'user-1' });

    // Assert
    const events = eventBus.getEventsByType(AccountDeactivatedEvent);
    expect(events[0].reason).toBeUndefined();
  });

  it('should throw EntityNotFoundException when account does not exist', async () => {
    // Arrange & Act & Assert
    expect(
      useCase.execute({ userId: 'nonexistent' }),
    ).rejects.toThrow(EntityNotFoundException);
  });

  it('should throw AccountDeactivatedException when account is already deactivated', async () => {
    // Arrange
    repository.seedAccount(
      createAccountData({ id: 'user-1', isActive: false }),
    );

    // Act & Assert
    expect(
      useCase.execute({ userId: 'user-1' }),
    ).rejects.toThrow(AccountDeactivatedException);
  });

  it('should not publish events when account is not found', async () => {
    // Act
    try {
      await useCase.execute({ userId: 'nonexistent' });
    } catch {
      // expected
    }

    // Assert
    expect(eventBus.getPublishedEvents()).toHaveLength(0);
  });

  it('should not publish events when account is already deactivated', async () => {
    // Arrange
    repository.seedAccount(
      createAccountData({ id: 'user-1', isActive: false }),
    );

    // Act
    try {
      await useCase.execute({ userId: 'user-1' });
    } catch {
      // expected
    }

    // Assert
    expect(eventBus.getPublishedEvents()).toHaveLength(0);
  });
});
