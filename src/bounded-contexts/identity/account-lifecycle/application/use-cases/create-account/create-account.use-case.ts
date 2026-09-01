import { LoggerPort } from '@/shared-kernel';
import { Password } from '../../../../password-management/domain/value-objects';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import type {
  CreateAccountCommand,
  CreateAccountPort,
  CreateAccountResult,
} from '../../../application/ports';
import { AccountCreatedEvent } from '../../../domain/events';
import {
  AccountAlreadyExistsException,
  ConsentVersionMismatchException,
  InvalidRegistrationTokenException,
} from '../../../domain/exceptions';
import {
  AccountLifecycleRepositoryPort,
  PasswordHasherPort,
  RegistrationTokenVerifierPort,
  VersionConfigPort,
} from '../../../domain/ports';
import { AcceptConsentUseCase } from '../accept-consent/accept-consent.use-case';

export class CreateAccountUseCase implements CreateAccountPort {
  constructor(
    private readonly repository: AccountLifecycleRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly eventBus: EventBusPort,
    private readonly acceptConsent: AcceptConsentUseCase,
    private readonly versionConfig: VersionConfigPort,
    private readonly registrationTokenVerifier: RegistrationTokenVerifierPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: CreateAccountCommand): Promise<CreateAccountResult> {
    const {
      name,
      email,
      password,
      acceptedTosVersion,
      acceptedPrivacyVersion,
      emailVerificationToken,
      ipAddress,
      userAgent,
    } = command;

    // Identifier-first signup: the token proves this exact e-mail passed
    // the pre-signup verification step, so the account is born verified.
    // A present-but-bad token FAILS the signup instead of silently
    // downgrading — the client believes the e-mail is verified and would
    // otherwise strand the user in a state it doesn't render.
    let emailVerified = false;
    if (emailVerificationToken !== undefined) {
      const verifiedEmail = this.registrationTokenVerifier.verify(emailVerificationToken);
      if (verifiedEmail === null || verifiedEmail !== email) {
        throw new InvalidRegistrationTokenException();
      }
      emailVerified = true;
    }

    // LGPD: reject signup if the client didn't acknowledge the current legal versions.
    const currentTos = this.versionConfig.getTosVersion();
    const currentPrivacy = this.versionConfig.getPrivacyPolicyVersion();
    if (acceptedTosVersion !== currentTos || acceptedPrivacyVersion !== currentPrivacy) {
      throw new ConsentVersionMismatchException(currentTos, currentPrivacy);
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
      emailVerified,
    });

    // LGPD: persist the two consents with audit trail (IP + user agent).
    //
    // P1-055 — recovery semantics. The signup flow runs in this order:
    //   account.create → consent × 2 → token generation → event publish.
    // A crash between `account.create` and the second consent would
    // leave a User row without one or both consents. The recovery is:
    //   - On the next login attempt the consent gate detects the
    //     missing row and re-prompts the user via /accept-consent.
    //   - The compliance team's nightly audit job flags the gap.
    // Wrapping the three writes in a real `runInTransaction` would
    // require the consent port to accept a tx client, a change we
    // deferred to P3 — the tx scope crosses too many BC boundaries
    // to land in this PR. Switching from Promise.all to sequential
    // here so a TOS failure aborts before privacy is recorded.
    await this.acceptConsent.execute({
      userId: account.id,
      documentType: 'TERMS_OF_SERVICE',
      ipAddress,
      userAgent,
    });
    await this.acceptConsent.execute({
      userId: account.id,
      documentType: 'PRIVACY_POLICY',
      ipAddress,
      userAgent,
    });

    // Publish domain event
    const event = new AccountCreatedEvent(account.id, account.email);
    this.eventBus.publish(event);

    return {
      userId: account.id,
      email: account.email,
    };
  }
}
