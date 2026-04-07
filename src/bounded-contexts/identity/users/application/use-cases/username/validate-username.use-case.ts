import type { ValidateUsernameResponse, UsernameValidationError } from '@/shared-kernel';
import type { UsernameRepositoryPort } from '../../ports/username.port';

/**
 * Reserved usernames that cannot be used by regular users.
 */
const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'www',
  'support',
  'help',
  'root',
  'system',
  'null',
  'undefined',
  'me',
  'profile',
  'settings',
  'login',
  'logout',
  'register',
  'signup',
  'signin',
  'auth',
  'oauth',
  'callback',
  'webhook',
  'webhooks',
  'status',
  'health',
  'ping',
  'static',
  'assets',
  'public',
  'private',
]);

/**
 * Validate Username Use Case
 *
 * Single Responsibility: Validate username format and availability.
 * Returns structured validation result for frontend consumption.
 */
export class ValidateUsernameUseCase {
  constructor(private readonly repository: UsernameRepositoryPort) {}

  async execute(username: string, userId?: string): Promise<ValidateUsernameResponse> {
    const errors: UsernameValidationError[] = [];
    const trimmed = username.trim();

    // Check for uppercase
    if (trimmed !== trimmed.toLowerCase()) {
      errors.push({
        code: 'UPPERCASE',
        message: 'Username must contain only lowercase letters',
      });
    }

    const normalized = trimmed.toLowerCase();

    // Check length
    if (normalized.length < 3) {
      errors.push({
        code: 'TOO_SHORT',
        message: 'Username must be at least 3 characters',
      });
    }

    if (normalized.length > 30) {
      errors.push({
        code: 'TOO_LONG',
        message: 'Username cannot exceed 30 characters',
      });
    }

    // Check format (only lowercase letters, numbers, underscores)
    if (normalized.length >= 3 && !/^[a-z0-9_]+$/.test(normalized)) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Username can only contain lowercase letters, numbers, and underscores',
      });
    }

    // Check start character
    if (normalized.length >= 1 && !/^[a-z]/.test(normalized)) {
      errors.push({
        code: 'INVALID_START',
        message: 'Username must start with a letter',
      });
    }

    // Check end character
    if (normalized.length >= 1 && !/[a-z0-9]$/.test(normalized)) {
      errors.push({
        code: 'INVALID_END',
        message: 'Username must end with a letter or number',
      });
    }

    // Check consecutive underscores
    if (normalized.includes('__')) {
      errors.push({
        code: 'CONSECUTIVE_UNDERSCORES',
        message: 'Username cannot contain consecutive underscores',
      });
    }

    // Check reserved usernames
    if (RESERVED_USERNAMES.has(normalized)) {
      errors.push({
        code: 'RESERVED',
        message: 'This username is reserved',
      });
    }

    // Only check availability if format is valid
    const isFormatValid = errors.length === 0;
    let available: boolean | undefined;

    if (isFormatValid) {
      const isTaken = await this.repository.isUsernameTaken(normalized, userId);
      available = !isTaken;

      if (isTaken) {
        errors.push({
          code: 'ALREADY_TAKEN',
          message: 'This username is already taken',
        });
      }
    }

    return {
      username: normalized,
      valid: errors.length === 0,
      available,
      errors,
    };
  }
}
