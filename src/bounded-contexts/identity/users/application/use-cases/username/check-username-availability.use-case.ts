/**
 * Check Username Availability Use Case.
 *
 * Lighter-weight cousin of `ValidateUsernameUseCase`: returns a single
 * `{ available, reason? }` shape that the UI uses for the live
 * availability indicator on the username field. When the form needs the
 * full multi-error breakdown (signup, change-username), prefer the
 * validate UC.
 *
 * Format and reserved-name checks happen first to short-circuit before
 * paying a DB roundtrip; only well-formed names hit the repository.
 */

import { RESERVED_USERNAMES_SET } from '../../../domain/value-objects/reserved-usernames.const';
import {
  CheckUsernameAvailabilityUseCasePort,
  type UsernameAvailability,
} from '../../ports/check-username-availability.use-case.port';
import { UsernameRepositoryPort } from '../../ports/username.port';

const MIN_LENGTH = 3;
const MAX_LENGTH = 30;
const FORMAT_RE = /^[a-z0-9_]+$/;
const STARTS_OK_RE = /^[a-z0-9]/;
const ENDS_OK_RE = /[a-z0-9]$/;

function isValidFormat(username: string): boolean {
  if (username.length < MIN_LENGTH || username.length > MAX_LENGTH) return false;
  if (!FORMAT_RE.test(username)) return false;
  if (!STARTS_OK_RE.test(username)) return false;
  if (!ENDS_OK_RE.test(username)) return false;
  if (username.includes('__')) return false;
  return true;
}

export class CheckUsernameAvailabilityUseCase extends CheckUsernameAvailabilityUseCasePort {
  constructor(private readonly repository: UsernameRepositoryPort) {
    super();
  }

  async execute(username: string, requesterUserId?: string): Promise<UsernameAvailability> {
    const normalized = username.trim().toLowerCase();

    if (!isValidFormat(normalized)) {
      return { username: normalized, available: false, reason: 'invalid_format' };
    }

    if (RESERVED_USERNAMES_SET.has(normalized)) {
      return { username: normalized, available: false, reason: 'reserved' };
    }

    const taken = await this.repository.isUsernameTaken(normalized, requesterUserId);
    if (taken) return { username: normalized, available: false, reason: 'taken' };

    return { username: normalized, available: true };
  }
}
