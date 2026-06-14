import { LoggerPort } from '@/shared-kernel';
import type { EnvConfig } from '@/shared-kernel/config';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { InvalidCurrentPasswordException, SamePasswordException } from '../../domain/exceptions';
import {
  PasswordHasherPort,
  PasswordRepositoryPort,
  VerificationCodeStorePort,
} from '../../domain/ports';
import { Password } from '../../domain/value-objects';
import type {
  RequestPasswordChangeCommand,
  RequestPasswordChangePort,
  RequestPasswordChangeResult,
} from '../ports';

/** Object able to deliver the password-change code email (platform EmailService). */
export interface PasswordChangeCodeEmailPort {
  sendPasswordChangeCode(email: string, name: string, code: string): Promise<void>;
}

const CODE_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

/** 6 numeric digits via CSPRNG — mirrors the email-verification token VO. */
function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 1_000_000).toString().padStart(6, '0');
}

export class RequestPasswordChangeUseCase implements RequestPasswordChangePort {
  constructor(
    private readonly passwordRepository: PasswordRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly codeStore: VerificationCodeStorePort,
    private readonly emailService: PasswordChangeCodeEmailPort,
    private readonly env: Pick<EnvConfig, 'NODE_ENV' | 'BYPASS_2FA'>,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: RequestPasswordChangeCommand): Promise<RequestPasswordChangeResult> {
    const { userId, currentPassword, newPassword } = command;

    // Strength check (throws WeakPasswordException) — same as the 1-step flow.
    Password.create(newPassword);

    const user = await this.passwordRepository.findById(userId);
    if (!user) throw new EntityNotFoundException('User', userId);

    const currentValid = await this.passwordHasher.compare(currentPassword, user.passwordHash);
    if (!currentValid) throw new InvalidCurrentPasswordException();

    const sameAsCurrent = await this.passwordHasher.compare(newPassword, user.passwordHash);
    if (sameAsCurrent) throw new SamePasswordException();

    // Stash the HASH of the new password (never plaintext) until the code is
    // confirmed; single-use + short TTL + deleted on confirm.
    const pendingPasswordHash = await this.passwordHasher.hash(newPassword);
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await this.codeStore.deleteUserPurposeTokens(userId, 'PASSWORD_CHANGE');
    await this.codeStore.createPurposeToken({
      userId,
      token: code,
      email: user.email,
      expiresAt,
      purpose: 'PASSWORD_CHANGE',
      pendingPasswordHash,
    });

    await this.emailService.sendPasswordChangeCode(user.email, user.name ?? 'User', code);
    this.logger.log('Password-change code issued', 'RequestPasswordChangeUseCase');

    const showTestCode = this.env.NODE_ENV !== 'production' && this.env.BYPASS_2FA === true;
    return {
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      ...(showTestCode ? { testCode: code } : {}),
    };
  }
}
