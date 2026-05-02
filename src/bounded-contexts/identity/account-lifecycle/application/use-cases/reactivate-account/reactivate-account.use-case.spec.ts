/**
 * Reactivate Account Use Case Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { AccountReactivatedEvent } from '../../../domain/events';
import { AccountAlreadyActiveException } from '../../../domain/exceptions';
import { createAccountData, InMemoryAccountLifecycleRepository } from '../../../testing';
import { ReactivateAccountUseCase } from './reactivate-account.use-case';

describe('ReactivateAccountUseCase', () => {
  let useCase: ReactivateAccountUseCase;
  let repository: InMemoryAccountLifecycleRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryAccountLifecycleRepository();
    eventBus = new InMemoryEventBus();
    useCase = new ReactivateAccountUseCase(repository, eventBus, stubLogger);
  });

  it('reactivates a deactivated account and publishes AccountReactivatedEvent', async () => {
    repository.seedAccount(createAccountData({ id: 'user-1', isActive: false }));

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result.success).toBe(true);
    expect((await repository.findById('user-1'))?.isActive).toBe(true);
    expect(eventBus.hasPublished(AccountReactivatedEvent)).toBe(true);
  });

  it('throws EntityNotFoundException when account does not exist', async () => {
    await expect(useCase.execute({ userId: 'nonexistent' })).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('throws AccountAlreadyActiveException when account is already active', async () => {
    repository.seedAccount(createAccountData({ id: 'user-1', isActive: true }));
    await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(
      AccountAlreadyActiveException,
    );
  });
});
