import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryEventBus } from '@/bounded-contexts/identity/shared-kernel/testing';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  AccountAlreadyExistsException,
  InvalidRegistrationTokenException,
} from '../../../domain/exceptions';
import {
  InMemoryAccountLifecycleRepository,
  InMemoryAuditLogger,
  InMemoryConsentRepository,
  InMemoryPasswordHasher,
  InMemoryVersionConfig,
} from '../../../testing';
import { AcceptConsentUseCase } from '../accept-consent/accept-consent.use-case';
import { CompleteUnverifiedAccountUseCase } from './complete-unverified-account.use-case';

const EMAIL = 'pending@example.com';
const command = {
  email: EMAIL,
  password: 'StrongPass1!',
  emailVerificationToken: `verified:${EMAIL}`,
  acceptedTosVersion: '1.0.0',
  acceptedPrivacyVersion: '1.0.0',
};

describe('CompleteUnverifiedAccountUseCase', () => {
  let repository: InMemoryAccountLifecycleRepository;
  let consents: InMemoryConsentRepository;
  let invalidated: string[];
  let cleared: string[];
  let useCase: CompleteUnverifiedAccountUseCase;

  beforeEach(() => {
    repository = new InMemoryAccountLifecycleRepository();
    consents = new InMemoryConsentRepository();
    invalidated = [];
    cleared = [];
    const versions = new InMemoryVersionConfig();
    useCase = new CompleteUnverifiedAccountUseCase(
      repository,
      new InMemoryPasswordHasher(),
      { verify: (token) => (token.startsWith('verified:') ? token.slice(9) : null) },
      new AcceptConsentUseCase(consents, versions, new InMemoryAuditLogger(), stubLogger),
      versions,
      {
        invalidateAllSessions: async (id) => {
          invalidated.push(id);
        },
      },
      {
        invalidateEmailCache: async (email) => {
          cleared.push(`email:${email}`);
        },
        invalidateSessionCache: async (id) => {
          cleared.push(`session:${id}`);
        },
      },
      new InMemoryEventBus(),
    );
  });

  it('preserves the account and replaces its password after email proof', async () => {
    const original = await repository.create({
      email: EMAIL,
      name: 'Existing User',
      passwordHash: 'old-hash',
    });
    const result = await useCase.execute(command);
    expect(result).toEqual({ userId: original.id, email: EMAIL });
    expect((await repository.findByEmail(EMAIL))?.name).toBe('Existing User');
    expect(await repository.findPasswordHashById(original.id)).toBe('hashed:StrongPass1!');
    expect(await repository.findIdentitySignalsByEmail(EMAIL)).toEqual({
      emailVerified: true,
      hasPassword: true,
    });
    expect(invalidated).toEqual([original.id]);
    expect(cleared).toEqual([`email:${EMAIL}`, `session:${original.id}`]);
    expect(consents.getAllConsents().map((item) => item.documentType)).toEqual([
      'TERMS_OF_SERVICE',
      'PRIVACY_POLICY',
    ]);
  });

  it('rejects a token for another email without changing the account', async () => {
    const original = await repository.create({ email: EMAIL, passwordHash: 'old-hash' });
    await expect(
      useCase.execute({ ...command, emailVerificationToken: 'verified:other@example.com' }),
    ).rejects.toBeInstanceOf(InvalidRegistrationTokenException);
    expect(await repository.findPasswordHashById(original.id)).toBe('old-hash');
    expect(invalidated).toHaveLength(0);
  });

  it('cannot overwrite an already verified account or complete twice', async () => {
    await repository.create({ email: EMAIL, passwordHash: 'old-hash' });
    await useCase.execute(command);
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(AccountAlreadyExistsException);
    expect(invalidated).toHaveLength(1);
  });
});
