/**
 * Confirm Account Deletion Use Case Tests
 *
 * Step 2: a valid emailed code permanently erases the account; an invalid one
 * is rejected and leaves the account intact.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type {
  CreateCodeInput,
  PendingCode,
  VerificationCodeStorePort,
} from '../../../../password-management/domain/ports';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { AccountDeletedEvent } from '../../../domain/events';
import { InvalidAccountDeletionCodeException } from '../../../domain/exceptions';
import { createAccountData, InMemoryAccountLifecycleRepository } from '../../../testing';
import { ConfirmAccountDeletionUseCase } from './confirm-account-deletion.use-case';

const VALID_CODE = '123456';

/** Code store that only recognises VALID_CODE for ACCOUNT_DELETION. */
class StubCodeStore implements VerificationCodeStorePort {
  deleted: string[] = [];
  async createPurposeToken(_input: CreateCodeInput): Promise<void> {}
  async findPurposeToken(
    userId: string,
    token: string,
    purpose: string,
  ): Promise<PendingCode | null> {
    if (token !== VALID_CODE || purpose !== 'ACCOUNT_DELETION') return null;
    return { userId, pendingEmail: null, pendingPasswordHash: null, expiresAt: new Date() };
  }
  async deleteUserPurposeTokens(userId: string): Promise<void> {
    this.deleted.push(userId);
  }
}

describe('ConfirmAccountDeletionUseCase', () => {
  let useCase: ConfirmAccountDeletionUseCase;
  let repository: InMemoryAccountLifecycleRepository;
  let codeStore: StubCodeStore;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryAccountLifecycleRepository();
    codeStore = new StubCodeStore();
    eventBus = new InMemoryEventBus();
    useCase = new ConfirmAccountDeletionUseCase(repository, codeStore, eventBus, stubLogger);
    repository.seedAccount(createAccountData({ id: 'user-1', email: 'del@example.com' }));
  });

  it('deletes the account and publishes the event on a valid code', async () => {
    const result = await useCase.execute({ userId: 'user-1', code: VALID_CODE });

    expect(result.success).toBe(true);
    expect(await repository.findById('user-1')).toBeNull();
    expect(codeStore.deleted).toContain('user-1');
    expect(eventBus.hasPublished(AccountDeletedEvent)).toBe(true);
  });

  it('rejects an invalid code and keeps the account', async () => {
    await expect(
      useCase.execute({ userId: 'user-1', code: '000000' }),
    ).rejects.toBeInstanceOf(InvalidAccountDeletionCodeException);
    expect(await repository.findById('user-1')).not.toBeNull();
  });
});
