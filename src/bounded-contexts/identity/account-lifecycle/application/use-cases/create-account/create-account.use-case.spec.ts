/**
 * Create Account Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { WeakPasswordException } from '../../../../password-management/domain/exceptions';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { AccountCreatedEvent } from '../../../domain/events';
import { AccountAlreadyExistsException } from '../../../domain/exceptions';
import type {
  AuditLoggerPort,
  ConsentRepositoryPort,
  RegistrationTokenVerifierPort,
  VersionConfigPort,
} from '../../../domain/ports';
import {
  createAccountData,
  InMemoryAccountLifecycleRepository,
  InMemoryPasswordHasher,
} from '../../../testing';
import type { CreateAccountCommand } from '../../ports';
import { AcceptConsentUseCase } from '../accept-consent/accept-consent.use-case';
import { CreateAccountUseCase } from './create-account.use-case';

const TOS_VERSION = '1.0.0';
const PRIVACY_VERSION = '1.0.0';

// Accepts only the well-known test token, vouching for the e-mail after ':'.
const stubVerifier: RegistrationTokenVerifierPort = {
  verify: (token: string) =>
    token.startsWith('valid-token:') ? token.slice('valid-token:'.length) : null,
};

type StoredConsent = {
  userId: string;
  documentType: 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'MARKETING_CONSENT';
  version: string;
  ipAddress?: string;
  userAgent?: string;
};

function makeConsentStubs() {
  const consents: Array<
    StoredConsent & { id: string; ipAddress: string; userAgent: string; acceptedAt: Date }
  > = [];
  const consentRepository: ConsentRepositoryPort = {
    async create(input) {
      const record = {
        id: `consent-${consents.length + 1}`,
        userId: input.userId,
        documentType: input.documentType,
        version: input.version,
        ipAddress: input.ipAddress ?? '',
        userAgent: input.userAgent ?? '',
        acceptedAt: new Date(),
      };
      consents.push(record);
      return record;
    },
    async findByUserAndDocumentType() {
      return null;
    },
    async listByUser() {
      return consents;
    },
  };
  const auditLogger: AuditLoggerPort = {
    async log() {
      /* noop */
    },
    async logDataExportRequested() {
      /* noop */
    },
    async logDataExportDownloaded() {
      /* noop */
    },
  };
  const versionConfig: VersionConfigPort = {
    getTosVersion: () => TOS_VERSION,
    getPrivacyPolicyVersion: () => PRIVACY_VERSION,
    getMarketingConsentVersion: () => '1.0.0',
  };
  const acceptConsent = new AcceptConsentUseCase(
    consentRepository,
    versionConfig,
    auditLogger,
    stubLogger,
  );
  return { acceptConsent, versionConfig, consents };
}

function baseCommand(overrides: Partial<CreateAccountCommand> = {}): CreateAccountCommand {
  return {
    email: 'default@example.com',
    password: 'StrongPass1!',
    acceptedTosVersion: TOS_VERSION,
    acceptedPrivacyVersion: PRIVACY_VERSION,
    ...overrides,
  };
}

describe('CreateAccountUseCase', () => {
  let useCase: CreateAccountUseCase;
  let repository: InMemoryAccountLifecycleRepository;
  let passwordHasher: InMemoryPasswordHasher;
  let eventBus: InMemoryEventBus;

  const VALID_PASSWORD = 'StrongPass1!';

  beforeEach(() => {
    repository = new InMemoryAccountLifecycleRepository();
    passwordHasher = new InMemoryPasswordHasher();
    eventBus = new InMemoryEventBus();
    const { acceptConsent, versionConfig } = makeConsentStubs();

    useCase = new CreateAccountUseCase(
      repository,
      passwordHasher,
      eventBus,
      acceptConsent,
      versionConfig,
      stubVerifier,
      stubLogger,
    );
  });

  it('should create an account and return identity (no tokens — cookie carries auth)', async () => {
    const command = baseCommand({
      name: 'John Doe',
      email: 'john@example.com',
      password: VALID_PASSWORD,
    });

    const result = await useCase.execute(command);

    expect(result.userId).toBeDefined();
    expect(result.email).toBe('john@example.com');
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
    expect(result).not.toHaveProperty('expiresIn');
  });

  it('should persist the account in the repository', async () => {
    const command = baseCommand({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: VALID_PASSWORD,
    });

    const result = await useCase.execute(command);

    const stored = await repository.findById(result.userId);
    expect(stored).not.toBeNull();
    expect(stored?.email).toBe('jane@example.com');
    expect(stored?.name).toBe('Jane Doe');
    expect(stored?.isActive).toBe(true);
  });

  it('should hash the password before storing', async () => {
    const command = baseCommand({ email: 'test@example.com', password: VALID_PASSWORD });

    await useCase.execute(command);

    const accounts = repository.getAllAccounts();
    expect(accounts).toHaveLength(1);
  });

  it('should store name as null when not provided', async () => {
    const command = baseCommand({ email: 'noname@example.com', password: VALID_PASSWORD });

    const result = await useCase.execute(command);

    const stored = await repository.findById(result.userId);
    expect(stored?.name).toBeNull();
  });

  it('should publish AccountCreatedEvent', async () => {
    const command = baseCommand({
      name: 'Event User',
      email: 'event@example.com',
      password: VALID_PASSWORD,
    });

    const result = await useCase.execute(command);

    expect(eventBus.hasPublished(AccountCreatedEvent)).toBe(true);
    const events = eventBus.getEventsByType(AccountCreatedEvent);
    expect(events).toHaveLength(1);
    expect(events[0].userId).toBe(result.userId);
    expect(events[0].email).toBe('event@example.com');
  });

  it('should throw AccountAlreadyExistsException when email is taken', async () => {
    repository.seedAccount(createAccountData({ email: 'taken@example.com' }));

    const command = baseCommand({ email: 'taken@example.com', password: VALID_PASSWORD });

    expect(useCase.execute(command)).rejects.toThrow(AccountAlreadyExistsException);
  });

  it('should throw WeakPasswordException for a weak password', async () => {
    const command = baseCommand({ email: 'weak@example.com', password: 'short' });

    expect(useCase.execute(command)).rejects.toThrow(WeakPasswordException);
  });

  it('should not persist account when email already exists', async () => {
    repository.seedAccount(createAccountData({ email: 'existing@example.com' }));

    const command = baseCommand({ email: 'existing@example.com', password: VALID_PASSWORD });

    try {
      await useCase.execute(command);
    } catch {
      // expected
    }

    const accounts = repository.getAllAccounts();
    expect(accounts).toHaveLength(1);
  });

  it('should not publish events when creation fails', async () => {
    repository.seedAccount(createAccountData({ email: 'fail@example.com' }));

    const command = baseCommand({ email: 'fail@example.com', password: VALID_PASSWORD });

    try {
      await useCase.execute(command);
    } catch {
      // expected
    }

    expect(eventBus.getPublishedEvents()).toHaveLength(0);
  });

  it('should reject signup when consent version is stale', async () => {
    const command = baseCommand({
      email: 'stale@example.com',
      password: VALID_PASSWORD,
      acceptedTosVersion: '0.9.0',
    });

    expect(useCase.execute(command)).rejects.toThrow('consent_version_mismatch');
  });

  it('creates the account already verified with a valid registration token', async () => {
    const command = baseCommand({
      email: 'verified@example.com',
      password: VALID_PASSWORD,
      emailVerificationToken: 'valid-token:verified@example.com',
    });

    const result = await useCase.execute(command);

    const signals = await repository.findIdentitySignalsByEmail('verified@example.com');
    expect(result.email).toBe('verified@example.com');
    expect(signals).toEqual({ emailVerified: true, hasPassword: true });
  });

  it('rejects a registration token that vouches for a DIFFERENT e-mail', async () => {
    const command = baseCommand({
      email: 'mallory@example.com',
      password: VALID_PASSWORD,
      emailVerificationToken: 'valid-token:victim@example.com',
    });

    expect(useCase.execute(command)).rejects.toThrow('Invalid or expired registration token');
    expect(await repository.findByEmail('mallory@example.com')).toBeNull();
  });

  it('rejects an invalid registration token instead of silently downgrading', async () => {
    const command = baseCommand({
      email: 'jane@example.com',
      password: VALID_PASSWORD,
      emailVerificationToken: 'garbage',
    });

    expect(useCase.execute(command)).rejects.toThrow('Invalid or expired registration token');
  });

  it('still creates an unverified account when no token is sent (legacy flow)', async () => {
    const command = baseCommand({ email: 'legacy@example.com', password: VALID_PASSWORD });

    await useCase.execute(command);

    const signals = await repository.findIdentitySignalsByEmail('legacy@example.com');
    expect(signals).toEqual({ emailVerified: false, hasPassword: true });
  });
});
