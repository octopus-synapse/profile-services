/**
 * Start Pre-Signup Verification Use Case Tests
 *
 * In-memory store + repository; a recording sender stub captures the
 * outbound code so the specs can assert on hash-at-rest semantics.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { hashToken } from '@/shared-kernel/crypto/token-hash';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  EmailAlreadyRegisteredException,
  VerificationTokenAlreadySentException,
} from '../../../domain/exceptions';
import type { VerificationEmailSenderPort } from '../../../domain/ports';
import {
  InMemoryEmailVerificationRepository,
  InMemoryPreSignupVerificationStore,
} from '../../../testing';
import { StartPreSignupVerificationUseCase } from './start-pre-signup-verification.use-case';

const EMAIL = 'jane.doe@example.com';

class RecordingSender implements VerificationEmailSenderPort {
  sent: Array<{ email: string; code: string }> = [];
  async sendVerificationEmail(email: string, _name: string | null, code: string): Promise<void> {
    this.sent.push({ email, code });
  }
}

describe('StartPreSignupVerificationUseCase', () => {
  let repository: InMemoryEmailVerificationRepository;
  let store: InMemoryPreSignupVerificationStore;
  let sender: RecordingSender;
  let useCase: StartPreSignupVerificationUseCase;

  beforeEach(() => {
    repository = new InMemoryEmailVerificationRepository();
    store = new InMemoryPreSignupVerificationStore();
    sender = new RecordingSender();
    useCase = new StartPreSignupVerificationUseCase(repository, store, sender, stubLogger, {
      NODE_ENV: 'test',
      BYPASS_2FA: true,
    });
  });

  it('sends a 6-digit code and stores only its hash', async () => {
    const result = await useCase.execute({ email: EMAIL });

    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]!.email).toBe(EMAIL);
    expect(sender.sent[0]!.code).toMatch(/^\d{6}$/);

    const challenge = await store.find(EMAIL);
    expect(challenge).not.toBeNull();
    expect(challenge!.codeHash).toBe(hashToken(sender.sent[0]!.code));
    expect(challenge!.attempts).toBe(0);

    expect(result.cooldownSeconds).toBe(60);
    // BYPASS_2FA outside production surfaces the code for e2e harnesses.
    expect(result.testCode).toBe(sender.sent[0]!.code);
  });

  it('rejects an e-mail that already has an account', async () => {
    repository.seedUser('user-1', EMAIL, false);

    await expect(useCase.execute({ email: EMAIL })).rejects.toBeInstanceOf(
      EmailAlreadyRegisteredException,
    );
    expect(sender.sent).toHaveLength(0);
  });

  it('enforces the resend cooldown', async () => {
    await useCase.execute({ email: EMAIL });
    await expect(useCase.execute({ email: EMAIL })).rejects.toBeInstanceOf(
      VerificationTokenAlreadySentException,
    );
    expect(sender.sent).toHaveLength(1);
  });
});
