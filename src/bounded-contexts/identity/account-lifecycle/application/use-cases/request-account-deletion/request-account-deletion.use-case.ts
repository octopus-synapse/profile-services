import { LoggerPort } from '@/shared-kernel';
import type { EnvConfig } from '@/shared-kernel/config';
import { EntityNotFoundException, UnauthorizedException } from '@/shared-kernel/exceptions';
import { VerificationCodeStorePort } from '../../../../password-management/domain/ports';
import {
  DELETION_CONFIRMATION_PHRASE,
  type RequestAccountDeletionCommand,
  RequestAccountDeletionPort,
  type RequestAccountDeletionResult,
} from '../../../application/ports';
import { AccountDeletionRequiresConfirmationException } from '../../../domain/exceptions';
import { AccountLifecycleRepositoryPort } from '../../../domain/ports';
import type { PasswordHasherPort } from '../../../domain/ports/password-hasher.port';

/** Object able to deliver the account-deletion code email (platform EmailService). */
export interface AccountDeletionCodeEmailPort {
  sendAccountDeletionCode(email: string, name: string, code: string): Promise<void>;
}

const CODE_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

/** 6 numeric digits via CSPRNG — mirrors the credential-change code flows. */
function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 1_000_000).toString().padStart(6, '0');
}

export class RequestAccountDeletionUseCase implements RequestAccountDeletionPort {
  constructor(
    private readonly repository: AccountLifecycleRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly codeStore: VerificationCodeStorePort,
    private readonly emailService: AccountDeletionCodeEmailPort,
    private readonly env: Pick<EnvConfig, 'NODE_ENV' | 'BYPASS_2FA'>,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: RequestAccountDeletionCommand): Promise<RequestAccountDeletionResult> {
    const { userId, confirmationPhrase, currentPassword } = command;

    // Deliberate-action gate — same phrase the one-step flow required.
    if (confirmationPhrase !== DELETION_CONFIRMATION_PHRASE) {
      throw new AccountDeletionRequiresConfirmationException();
    }

    // Re-prove credential ownership before issuing the destructive code, so a
    // stolen cookie alone can't even start the deletion flow.
    const storedHash = await this.repository.findPasswordHashById(userId);
    if (!storedHash) {
      // OAuth-only sign-up: no password to re-auth against — refuse and let the
      // user set a password first (parity with the previous one-step flow).
      throw new UnauthorizedException('Re-authentication required');
    }
    const passwordOk = await this.passwordHasher.compare(currentPassword, storedHash);
    if (!passwordOk) {
      this.logger.warn(
        `Account-deletion re-auth failed for user ${userId}`,
        'RequestAccountDeletionUseCase',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const account = await this.repository.findById(userId);
    if (!account) {
      throw new EntityNotFoundException('Account', userId);
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await this.codeStore.deleteUserPurposeTokens(userId, 'ACCOUNT_DELETION');
    await this.codeStore.createPurposeToken({
      userId,
      token: code,
      email: account.email,
      expiresAt,
      purpose: 'ACCOUNT_DELETION',
    });

    await this.emailService.sendAccountDeletionCode(account.email, account.name ?? 'User', code);
    this.logger.log('Account-deletion code issued', 'RequestAccountDeletionUseCase');

    const showTestCode = this.env.NODE_ENV !== 'production' && this.env.BYPASS_2FA === true;
    return {
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      ...(showTestCode ? { testCode: code } : {}),
    };
  }
}
