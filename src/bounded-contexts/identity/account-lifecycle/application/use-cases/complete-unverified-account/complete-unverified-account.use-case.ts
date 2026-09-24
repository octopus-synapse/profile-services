import type { AuthenticationRepositoryPort } from '@/bounded-contexts/identity/authentication/domain/ports';
import { EmailVerifiedEvent } from '@/bounded-contexts/identity/email-verification/domain/events';
import type { SessionInvalidationPort } from '@/bounded-contexts/identity/password-management/domain/ports';
import { Password } from '@/bounded-contexts/identity/password-management/domain/value-objects';
import type { EventBusPort } from '@/bounded-contexts/identity/shared-kernel/ports/event-bus.port';
import {
  AccountAlreadyExistsException,
  ConsentVersionMismatchException,
  InvalidRegistrationTokenException,
} from '../../../domain/exceptions';
import type {
  AccountLifecycleRepositoryPort,
  PasswordHasherPort,
  RegistrationTokenVerifierPort,
  VersionConfigPort,
} from '../../../domain/ports';
import type {
  CompleteUnverifiedAccountCommand,
  CompleteUnverifiedAccountResult,
} from '../../ports/complete-unverified-account.port';
import { AcceptConsentUseCase } from '../accept-consent/accept-consent.use-case';

const JWT_SECOND_MS = 1000;

/** Completes an existing account only after proof of control of its email. */
export class CompleteUnverifiedAccountUseCase {
  constructor(
    private readonly repository: AccountLifecycleRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenVerifier: RegistrationTokenVerifierPort,
    private readonly acceptConsent: AcceptConsentUseCase,
    private readonly versions: VersionConfigPort,
    private readonly sessions: SessionInvalidationPort,
    private readonly authenticationCache: Pick<
      AuthenticationRepositoryPort,
      'invalidateEmailCache' | 'invalidateSessionCache'
    >,
    private readonly events: EventBusPort,
  ) {}

  async execute(
    command: CompleteUnverifiedAccountCommand,
  ): Promise<CompleteUnverifiedAccountResult> {
    if (this.tokenVerifier.verify(command.emailVerificationToken) !== command.email) {
      throw new InvalidRegistrationTokenException();
    }
    if (
      command.acceptedTosVersion !== this.versions.getTosVersion() ||
      command.acceptedPrivacyVersion !== this.versions.getPrivacyPolicyVersion()
    ) {
      throw new ConsentVersionMismatchException(
        this.versions.getTosVersion(),
        this.versions.getPrivacyPolicyVersion(),
      );
    }
    Password.create(command.password);
    const account = await this.repository.findByEmail(command.email);
    const signals = await this.repository.findIdentitySignalsByEmail(command.email);
    if (!account?.isActive || !signals || signals.emailVerified) {
      throw new AccountAlreadyExistsException(command.email);
    }

    // Record consent before changing credentials; upsert makes retries safe.
    for (const documentType of ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'] as const) {
      await this.acceptConsent.execute({
        userId: account.id,
        documentType,
        ipAddress: command.ipAddress,
        userAgent: command.userAgent,
      });
    }
    const hash = await this.passwordHasher.hash(command.password);
    // Revoke any old credentials before marking the account verified.
    await this.sessions.invalidateAllSessions(account.id);
    const completed = await this.repository.completeUnverified(command.email, hash);
    if (!completed) throw new AccountAlreadyExistsException(command.email);
    await this.authenticationCache.invalidateEmailCache(completed.email);
    await this.authenticationCache.invalidateSessionCache(completed.id);
    this.events.publish(new EmailVerifiedEvent(completed.id, completed.email));
    // JWT iat has second precision; the extractor rejects iat <= the
    // invalidation second. Let that second finish before the client logs in.
    const nextJwtSecond = (Math.floor(Date.now() / JWT_SECOND_MS) + 1) * JWT_SECOND_MS;
    await new Promise<void>((resolve) => setTimeout(resolve, nextJwtSecond - Date.now()));
    return { userId: completed.id, email: completed.email };
  }
}
