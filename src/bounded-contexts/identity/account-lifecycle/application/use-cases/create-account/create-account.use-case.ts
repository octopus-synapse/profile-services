import { BadRequestException } from '@nestjs/common';
import { TokenGeneratorPort } from '@/bounded-contexts/identity/authentication/domain/ports';
import { LoggerPort } from '@/shared-kernel';
import { Password } from '../../../../password-management/domain/value-objects';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import type {
  CreateAccountCommand,
  CreateAccountPort,
  CreateAccountResult,
} from '../../../application/ports';
import { AccountCreatedEvent } from '../../../domain/events';
import { AccountAlreadyExistsException } from '../../../domain/exceptions';
import {
  AccountLifecycleRepositoryPort,
  PasswordHasherPort,
  VersionConfigPort,
} from '../../../domain/ports';
import { AcceptConsentUseCase } from '../accept-consent/accept-consent.use-case';

export class CreateAccountUseCase implements CreateAccountPort {
  constructor(
    private readonly repository: AccountLifecycleRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly eventBus: EventBusPort,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly acceptConsent: AcceptConsentUseCase,
    private readonly versionConfig: VersionConfigPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: CreateAccountCommand): Promise<CreateAccountResult> {
    const {
      name,
      email,
      password,
      acceptedTosVersion,
      acceptedPrivacyVersion,
      ipAddress,
      userAgent,
    } = command;

    // LGPD: reject signup if the client didn't acknowledge the current legal versions.
    const currentTos = this.versionConfig.getTosVersion();
    const currentPrivacy = this.versionConfig.getPrivacyPolicyVersion();
    if (acceptedTosVersion !== currentTos || acceptedPrivacyVersion !== currentPrivacy) {
      throw new BadRequestException(
        `consent_version_mismatch: expected TOS=${currentTos}, Privacy=${currentPrivacy}`,
      );
    }

    // Validate password strength (throws WeakPasswordException if invalid)
    Password.create(password);

    // Check if email already exists
    const existingAccount = await this.repository.emailExists(email);
    if (existingAccount) {
      throw new AccountAlreadyExistsException(email);
    }

    // Hash password
    const passwordHash = await this.passwordHasher.hash(password);

    // Create account
    const account = await this.repository.create({
      name: name || null,
      email,
      passwordHash,
    });

    // LGPD: persist the two consents atomically with the audit trail (IP + user agent).
    await Promise.all([
      this.acceptConsent.execute({
        userId: account.id,
        documentType: 'TERMS_OF_SERVICE',
        ipAddress,
        userAgent,
      }),
      this.acceptConsent.execute({
        userId: account.id,
        documentType: 'PRIVACY_POLICY',
        ipAddress,
        userAgent,
      }),
    ]);

    // Generate auth tokens for auto-login (eliminates extra login request)
    const tokens = await this.tokenGenerator.generateTokenPair({
      userId: account.id,
      email: account.email,
    });

    // Publish domain event
    const event = new AccountCreatedEvent(account.id, account.email);
    this.eventBus.publish(event);

    return {
      userId: account.id,
      email: account.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }
}
