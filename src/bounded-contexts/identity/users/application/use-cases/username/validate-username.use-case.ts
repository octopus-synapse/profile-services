/**
 * Validate Username Use Case.
 *
 * Multi-error format + availability check for client-side form display.
 * The signup / change-username UI shows every problem at once so the user
 * fixes them in a single iteration.
 *
 * The UC returns `DomainCode[]` (codes + params) — the route handler
 * localizes each via `localizeDomainCode` against the request's
 * `Accept-Language`. No hardcoded English in this layer (Q8b).
 *
 * Codes match `@packages/i18n/ERROR_DICTIONARY` 1:1 so the catalog is the
 * single source of truth for both this UC and any thrown
 * `DomainException` that uses the same code (e.g.
 * `UsernameTakenException`).
 */

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

  // Format checks past length are guarded so a 0-char input doesn't fire
  // every regex error at once and drown out the actionable signal.
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
