import { LoggerPort } from '@/shared-kernel';
import type { EnvConfig } from '@/shared-kernel/config';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import {
  EmailAlreadyInUseException,
  EmailSameAsCurrentException,
  InvalidCurrentPasswordException,
} from '../../domain/exceptions';
import {
  PasswordHasherPort,
  PasswordRepositoryPort,
  VerificationCodeStorePort,
} from '../../domain/ports';
import type {
  RequestEmailChangeCommand,
  RequestEmailChangePort,
  RequestEmailChangeResult,
} from '../ports';

/** Object able to deliver the email-change code email (platform EmailService). */
export interface EmailChangeCodeEmailPort {
  sendEmailChangeCode(email: string, name: string, code: string): Promise<void>;
}

const CODE_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 1_000_000).toString().padStart(6, '0');
}

export class RequestEmailChangeUseCase implements RequestEmailChangePort {
  constructor(
    private readonly passwordRepository: PasswordRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly codeStore: VerificationCodeStorePort,
    private readonly emailService: EmailChangeCodeEmailPort,
    private readonly env: Pick<EnvConfig, 'NODE_ENV' | 'BYPASS_2FA'>,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: RequestEmailChangeCommand): Promise<RequestEmailChangeResult> {
    const { userId, currentPassword } = command;
    const newEmail = command.newEmail.trim().toLowerCase();

    // findById returns null for password-less (OAuth-only) accounts — they
    // can't supply a current password, so the flow is unavailable to them.
    const user = await this.passwordRepository.findById(userId);
    if (!user) throw new EntityNotFoundException('User', userId);

    const currentValid = await this.passwordHasher.compare(currentPassword, user.passwordHash);
    if (!currentValid) throw new InvalidCurrentPasswordException();

    if (newEmail === user.email.trim().toLowerCase()) throw new EmailSameAsCurrentException();
    if (await this.passwordRepository.emailExists(newEmail)) {
      throw new EmailAlreadyInUseException();
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await this.codeStore.deleteUserPurposeTokens(userId, 'EMAIL_CHANGE');
    await this.codeStore.createPurposeToken({
      userId,
      token: code,
      email: newEmail,
      expiresAt,
      purpose: 'EMAIL_CHANGE',
      pendingEmail: newEmail,
    });

    // Code goes to the NEW address so confirming it proves control.
    await this.emailService.sendEmailChangeCode(newEmail, user.name ?? 'User', code);
    this.logger.log('Email-change code issued', 'RequestEmailChangeUseCase');

    const showTestCode = this.env.NODE_ENV !== 'production' && this.env.BYPASS_2FA === true;
    return {
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      ...(showTestCode ? { testCode: code } : {}),
    };
  }
}
