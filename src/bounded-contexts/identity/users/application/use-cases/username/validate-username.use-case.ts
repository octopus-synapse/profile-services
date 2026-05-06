import { domainCode } from '@/shared-kernel/i18n/localize-domain-code';
import { RESERVED_USERNAMES_SET } from '../../../domain/value-objects/reserved-usernames.const';
import { UsernameRepositoryPort } from '../../ports/username.port';
import {
  type UsernameValidationResult,
  ValidateUsernameUseCasePort,
} from '../../ports/validate-username.use-case.port';

const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

export class ValidateUsernameUseCase extends ValidateUsernameUseCasePort {
  constructor(private readonly repository: UsernameRepositoryPort) {
    super();
  }

  async execute(username: string, requesterUserId?: string): Promise<UsernameValidationResult> {
    const trimmed = username.trim();
    const errors = collectFormatErrors(trimmed);
    const normalized = trimmed.toLowerCase();

    let available: boolean | undefined;
    if (errors.length === 0) {
      const taken = await this.repository.isUsernameTaken(normalized, requesterUserId);
      available = !taken;
      if (taken) errors.push(domainCode('USERNAME_TAKEN'));
    }

    return {
      username: normalized,
      valid: errors.length === 0,
      available,
      errors,
    };
  }
}

function collectFormatErrors(trimmed: string): ReturnType<typeof domainCode>[] {
  const errors: ReturnType<typeof domainCode>[] = [];

  if (trimmed !== trimmed.toLowerCase()) {
    errors.push(domainCode('USERNAME_MUST_BE_LOWERCASE'));
  }

  const normalized = trimmed.toLowerCase();

  if (normalized.length < MIN_LENGTH) {
    errors.push(domainCode('USERNAME_TOO_SHORT', { min: MIN_LENGTH }));
  }

  if (normalized.length > MAX_LENGTH) {
    errors.push(domainCode('USERNAME_TOO_LONG', { max: MAX_LENGTH }));
  }

  if (normalized.length >= MIN_LENGTH && !/^[a-z0-9_]+$/.test(normalized)) {
    errors.push(domainCode('USERNAME_INVALID_FORMAT'));
  }

  if (normalized.length >= 1 && !/^[a-z]/.test(normalized)) {
    errors.push(domainCode('USERNAME_INVALID_START'));
  }

  if (normalized.length >= 1 && !/[a-z0-9]$/.test(normalized)) {
    errors.push(domainCode('USERNAME_INVALID_END'));
  }

  if (normalized.includes('__')) {
    errors.push(domainCode('USERNAME_CONSECUTIVE_UNDERSCORES'));
  }

  if (RESERVED_USERNAMES_SET.has(normalized)) {
    errors.push(domainCode('USERNAME_RESERVED'));
  }

  return errors;
}
