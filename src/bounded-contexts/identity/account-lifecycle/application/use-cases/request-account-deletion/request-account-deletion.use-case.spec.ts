/**
 * Request Account Deletion Use Case Tests
 *
 * Step 1 of the two-step deletion: re-auth (phrase + password) gates the
 * issuing of a single-use code. Nothing is deleted here.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { UnauthorizedException } from '@/shared-kernel/exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type {
  CreateCodeInput,
  PendingCode,
  VerificationCodeStorePort,
} from '../../../../password-management/domain/ports';
import { DELETION_CONFIRMATION_PHRASE } from '../../../application/ports';
import { AccountDeletionRequiresConfirmationException } from '../../../domain/exceptions';
import type { PasswordHasherPort } from '../../../domain/ports/password-hasher.port';
import { createAccountData, InMemoryAccountLifecycleRepository } from '../../../testing';
import {
  type AccountDeletionCodeEmailPort,
  RequestAccountDeletionUseCase,
} from './request-account-deletion.use-case';

const FAKE_HASH = '$bcrypt$stub';

class StubPasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === FAKE_HASH && plain === 'correct';
  }
}

class InMemoryCodeStore implements VerificationCodeStorePort {
  rows: CreateCodeInput[] = [];
  async createPurposeToken(input: CreateCodeInput): Promise<void> {
    this.rows.push(input);
  }
  async findPurposeToken(): Promise<PendingCode | null> {
    return null;
  }
  async deleteUserPurposeTokens(): Promise<void> {}
}

class StubEmail implements AccountDeletionCodeEmailPort {
  sent: { email: string; code: string }[] = [];
  async sendAccountDeletionCode(email: string, _name: string, code: string): Promise<void> {
    this.sent.push({ email, code });
  }
}

const ENV = { NODE_ENV: 'test' as const, BYPASS_2FA: false };

describe('RequestAccountDeletionUseCase', () => {
  let useCase: RequestAccountDeletionUseCase;
  let repository: InMemoryAccountLifecycleRepository;
  let codeStore: InMemoryCodeStore;
  let email: StubEmail;

  beforeEach(() => {
    repository = new InMemoryAccountLifecycleRepository();
    codeStore = new InMemoryCodeStore();
    email = new StubEmail();
    useCase = new RequestAccountDeletionUseCase(
      repository,
      new StubPasswordHasher(),
      codeStore,
      email,
      ENV,
      stubLogger,
    );
    repository.seedAccount(createAccountData({ id: 'user-1', email: 'del@example.com' }));
    repository.seedPasswordHash('user-1', FAKE_HASH);
  });

  it('issues a code and emails it when phrase + password are correct', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
      currentPassword: 'correct',
    });

    expect(result.cooldownSeconds).toBeGreaterThan(0);
    expect(codeStore.rows).toHaveLength(1);
    expect(codeStore.rows[0]!.purpose).toBe('ACCOUNT_DELETION');
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]!.code).toBe(codeStore.rows[0]!.token);
    // The account is NOT deleted at the request step.
    expect(await repository.findById('user-1')).not.toBeNull();
  });

  it('rejects a wrong confirmation phrase before issuing a code', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        confirmationPhrase: 'WRONG',
        currentPassword: 'correct',
      }),
    ).rejects.toBeInstanceOf(AccountDeletionRequiresConfirmationException);
    expect(codeStore.rows).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it('rejects a wrong current password', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
        currentPassword: 'nope',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(codeStore.rows).toHaveLength(0);
  });

  it('refuses when no password is set (OAuth-only)', async () => {
    repository.seedAccount(createAccountData({ id: 'user-2', email: 'oauth@example.com' }));
    await expect(
      useCase.execute({
        userId: 'user-2',
        confirmationPhrase: DELETION_CONFIRMATION_PHRASE,
        currentPassword: 'correct',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
