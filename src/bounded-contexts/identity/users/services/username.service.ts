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
import { UsersRepository } from '@/bounded-contexts/identity/users/users.repository';
import type {
  UpdateUsername,
  UsernameValidationError,
  ValidateUsernameResponse,
} from '@/shared-kernel';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { ERROR_MESSAGES } from '@/shared-kernel';

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
    const existingUser = await this.usersRepository.findUserById(userId);
    if (!existingUser) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const { username: newUsername } = updateUsername;

    // BUG-001 FIX: REJECT uppercase usernames instead of converting
    this.validateUsernameFormat(newUsername);

    if (existingUser.username === newUsername) {
      return {
        success: true,
        message: 'Username unchanged',
        username: existingUser.username,
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
      oldUsername: existingUser.username,
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

  /**
   * Validates username format and availability.
   * Returns structured validation result for frontend consumption.
   */
  async validateUsername(
    username: string,
    userId?: string,
  ): Promise<ValidateUsernameResponse> {
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
        message:
          'Username can only contain lowercase letters, numbers, and underscores',
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
      const isTaken = await this.usersRepository.isUsernameTaken(
        normalized,
        userId,
      );
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

  private async checkCooldownPeriod(userId: string): Promise<void> {
    const lastUsernameUpdate =
      await this.usersRepository.findLastUsernameUpdateByUserId(userId);
    if (!lastUsernameUpdate) return;

    const daysSinceLastUpdate = Math.floor(
      (Date.now() - lastUsernameUpdate.getTime()) / (1000 * 60 * 60 * 24),
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
