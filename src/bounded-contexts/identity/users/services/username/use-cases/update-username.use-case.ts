import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions';
import type { UpdatedUsername, UsernameRepositoryPort } from '../ports/username.port';

const USERNAME_UPDATE_COOLDOWN_DAYS = 30;

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
 * Regex for valid username format:
 * - Must start with a lowercase letter
 * - Can contain lowercase letters, numbers, and underscores
 * - Must be 3-30 characters long
 */
const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,29}$/;

/**
 * Update Username Use Case
 *
 * Single Responsibility: Handle username update with validation and cooldown.
 * Returns domain entity (UpdatedUsername), not envelope.
 */
export class UpdateUsernameUseCase {
  constructor(private readonly repository: UsernameRepositoryPort) {}

  async execute(userId: string, newUsername: string): Promise<UpdatedUsername> {
    const existingUser = await this.repository.findUserById(userId);
    if (!existingUser) {
      throw new EntityNotFoundException('User');
    }

    // Validate format before any other checks
    this.validateUsernameFormat(newUsername);

    // If username unchanged, return current
    if (existingUser.username === newUsername) {
      return { username: existingUser.username };
    }

    // Check cooldown and availability
    await this.checkCooldownPeriod(userId);
    await this.ensureUsernameAvailable(newUsername, userId);

    // Update username
    const updatedUser = await this.repository.updateUsername(userId, newUsername);

    // Return domain entity (not envelope)
    return { username: updatedUser.username };
  }

  private async checkCooldownPeriod(userId: string): Promise<void> {
    const lastUsernameUpdate = await this.repository.findLastUsernameUpdateByUserId(userId);
    if (!lastUsernameUpdate) return;

    const daysSinceLastUpdate = Math.floor(
      (Date.now() - lastUsernameUpdate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLastUpdate < USERNAME_UPDATE_COOLDOWN_DAYS) {
      const daysRemaining = USERNAME_UPDATE_COOLDOWN_DAYS - daysSinceLastUpdate;
      throw new ValidationException(
        `You can only change your username once every ${USERNAME_UPDATE_COOLDOWN_DAYS} days. Please wait ${daysRemaining} more day(s).`,
      );
    }
  }

  private async ensureUsernameAvailable(username: string, userId: string): Promise<void> {
    const isTaken = await this.repository.isUsernameTaken(username, userId);
    if (isTaken) {
      throw new ConflictException('Username already in use');
    }
  }

  private validateUsernameFormat(username: string): void {
    if (username !== username.toLowerCase()) {
      throw new ValidationException('Username must be lowercase');
    }

    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      throw new ValidationException('This username is reserved');
    }

    if (!USERNAME_REGEX.test(username)) {
      throw new ValidationException('Invalid username format');
    }

    if (username.includes('__') || username.endsWith('_')) {
      throw new ValidationException(
        'Username cannot contain consecutive underscores or end with an underscore',
      );
    }
  }
}
