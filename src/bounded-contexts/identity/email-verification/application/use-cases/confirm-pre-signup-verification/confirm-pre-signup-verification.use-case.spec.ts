/**
 * Confirm Pre-Signup Verification Use Case Tests
 *
 * Covers the happy path (code → registration token, challenge burned),
 * wrong-code attempt accounting, the self-destruct ceiling and the
 * missing-challenge case.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { hashToken } from '@/shared-kernel/crypto/token-hash';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InvalidVerificationTokenException } from '../../../domain/exceptions';
import type { RegistrationTokenIssuerPort } from '../../../domain/ports';
import { InMemoryPreSignupVerificationStore } from '../../../testing';
import {
  ConfirmPreSignupVerificationUseCase,
  PRE_SIGNUP_MAX_ATTEMPTS,
} from './confirm-pre-signup-verification.use-case';

const EMAIL = 'jane.doe@example.com';
const CODE = '123456';

const stubIssuer: RegistrationTokenIssuerPort = {
  issue: (email: string) => `signed:${email}`,
};

describe('ConfirmPreSignupVerificationUseCase', () => {
  let store: InMemoryPreSignupVerificationStore;
  let useCase: ConfirmPreSignupVerificationUseCase;

  beforeEach(async () => {
    store = new InMemoryPreSignupVerificationStore();
    useCase = new ConfirmPreSignupVerificationUseCase(store, stubIssuer, stubLogger);
    await store.set(EMAIL, { codeHash: hashToken(CODE), attempts: 0, createdAtMs: Date.now() }, 900);
  });

  it('issues the registration token and burns the challenge on the right code', async () => {
    const result = await useCase.execute({ email: EMAIL, code: CODE });

    expect(result).toEqual({ email: EMAIL, registrationToken: `signed:${EMAIL}` });
    expect(await store.find(EMAIL)).toBeNull();
  });

  it('rejects a wrong code and counts the attempt', async () => {
    await expect(useCase.execute({ email: EMAIL, code: '000000' })).rejects.toBeInstanceOf(
      InvalidVerificationTokenException,
    );
    expect((await store.find(EMAIL))!.attempts).toBe(1);
  });

  it('self-destructs after too many wrong codes — even the right one stops working', async () => {
    for (let i = 0; i < PRE_SIGNUP_MAX_ATTEMPTS; i++) {
      await useCase.execute({ email: EMAIL, code: '000000' }).catch(() => undefined);
    }
    await expect(useCase.execute({ email: EMAIL, code: CODE })).rejects.toBeInstanceOf(
      InvalidVerificationTokenException,
    );
    expect(await store.find(EMAIL)).toBeNull();
  });

  it('rejects when no challenge exists for the e-mail', async () => {
    await expect(
      useCase.execute({ email: 'other@example.com', code: CODE }),
    ).rejects.toBeInstanceOf(InvalidVerificationTokenException);
  });
});
