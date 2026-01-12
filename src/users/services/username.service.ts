/**
 * Username Service
 * Handles username operations with cooldown
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersRepository } from '../users.repository';
import type { UpdateUsername } from '@octopus-synapse/profile-contracts';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';

const USERNAME_UPDATE_COOLDOWN_DAYS = 30;

/**
 * Reserved usernames that cannot be used by regular users.
 * These are typically used for system routes, admin, or support purposes.
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

@Injectable()
export class UsernameService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async updateUsername(userId: string, updateUsername: UpdateUsername) {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const { username: newUsername } = updateUsername;

    // BUG-001 FIX: REJECT uppercase usernames instead of converting
    this.validateUsernameFormat(newUsername);

    if (user.username === newUsername) {
      return {
        success: true,
        message: 'Username unchanged',
        username: user.username,
      };
    }

    await this.checkCooldownPeriod(userId);
    await this.ensureUsernameAvailable(newUsername, userId);

    const updatedUser = await this.usersRepository.updateUsername(
      userId,
      newUsername,
    );

    this.logger.debug(`Username updated`, 'UsernameService', {
      userId,
      oldUsername: user.username,
      newUsername,
    });

    return {
      success: true,
      message: 'Username updated successfully',
      username: updatedUser.username,
    };
  }

  async checkUsernameAvailability(username: string, userId?: string) {
    const normalizedUsername = username.toLowerCase();
    const isTaken = await this.usersRepository.isUsernameTaken(
      normalizedUsername,
      userId,
    );

    return {
      username: normalizedUsername,
      available: !isTaken,
    };
  }

  private async checkCooldownPeriod(userId: string): Promise<void> {
    const lastUpdate = await this.usersRepository.getLastUsernameUpdate(userId);
    if (!lastUpdate) return;

    const daysSinceLastUpdate = Math.floor(
      (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLastUpdate < USERNAME_UPDATE_COOLDOWN_DAYS) {
      const daysRemaining = USERNAME_UPDATE_COOLDOWN_DAYS - daysSinceLastUpdate;
      throw new BadRequestException(
        `You can only change your username once every ${USERNAME_UPDATE_COOLDOWN_DAYS} days. Please wait ${daysRemaining} more day(s).`,
      );
    }
  }

  private async ensureUsernameAvailable(
    username: string,
    userId: string,
  ): Promise<void> {
    const isTaken = await this.usersRepository.isUsernameTaken(
      username,
      userId,
    );
    if (isTaken) {
      throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_IN_USE);
    }
  }

  /**
   * Validates username format according to business rules:
   * - Must be lowercase only (uppercase is REJECTED, not converted)
   * - Cannot be a reserved username
   * - Must match the required format pattern
   * - Cannot have consecutive underscores or end with underscore
   */
  private validateUsernameFormat(username: string): void {
    // BUG-001: REJECT uppercase usernames
    if (username !== username.toLowerCase()) {
      throw new BadRequestException(ERROR_MESSAGES.USERNAME_MUST_BE_LOWERCASE);
    }

    // BUG-002: Validate reserved usernames
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      throw new BadRequestException(ERROR_MESSAGES.USERNAME_RESERVED);
    }

    // BUG-003: Validate format (starts with letter, lowercase only)
    if (!USERNAME_REGEX.test(username)) {
      throw new BadRequestException(ERROR_MESSAGES.USERNAME_INVALID_FORMAT);
    }

    // Additional check for consecutive underscores or trailing underscore
    if (username.includes('__') || username.endsWith('_')) {
      throw new BadRequestException(
        ERROR_MESSAGES.USERNAME_INVALID_UNDERSCORES,
      );
    }
  }
}
