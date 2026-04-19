/**
 * Username Service (Facade)
 *
 * Delegates to use cases following Clean Architecture.
 * Single Responsibility: Facade that delegates to specific use cases.
 */

import { Inject, Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import type {
  UpdateUsername,
  UsernameValidationError,
  ValidateUsernameResponse,
} from '@/shared-kernel';
import { RESERVED_USERNAMES as RESERVED_USERNAMES_LIST } from '@/shared-kernel/schemas/primitives';
import { UsersRepository } from '../../infrastructure/adapters/persistence/users.repository';
import {
  type UpdatedUsername,
  USERNAME_USE_CASES,
  type UsernameAvailability,
  type UsernameUseCases,
} from '../ports/username.port';

const RESERVED_USERNAMES: ReadonlySet<string> = new Set(RESERVED_USERNAMES_LIST);

@Injectable()
export class UsernameService {
  constructor(
    @Inject(USERNAME_USE_CASES)
    private readonly useCases: UsernameUseCases,
    private readonly usersRepository: UsersRepository,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Update username
   * @returns UpdatedUsername (domain data, not envelope)
   */
  async updateUsername(userId: string, updateUsername: UpdateUsername): Promise<UpdatedUsername> {
    const result = await this.useCases.updateUsernameUseCase.execute(
      userId,
      updateUsername.username,
    );

    this.logger.debug(`Username updated`, 'UsernameService', {
      userId,
      newUsername: result.username,
    });

    return result;
  }

  /**
   * Check username availability.
   *
   * Validates format and reserved-name rules before hitting the database.
   * Returns the specific reason when not available so the UI can render
   * an accurate message.
   */
  async checkUsernameAvailability(
    username: string,
    userId?: string,
  ): Promise<UsernameAvailability> {
    const normalized = username.trim().toLowerCase();

    if (!this.isValidUsernameFormat(normalized)) {
      return { username: normalized, available: false, reason: 'invalid_format' };
    }

    if (RESERVED_USERNAMES.has(normalized)) {
      return { username: normalized, available: false, reason: 'reserved' };
    }

    const isTaken = await this.usersRepository.isUsernameTaken(normalized, userId);
    if (isTaken) {
      return { username: normalized, available: false, reason: 'taken' };
    }

    return { username: normalized, available: true };
  }

  private isValidUsernameFormat(username: string): boolean {
    if (username.length < 3 || username.length > 30) return false;
    if (!/^[a-z0-9_]+$/.test(username)) return false;
    if (!/^[a-z0-9]/.test(username)) return false;
    if (!/[a-z0-9]$/.test(username)) return false;
    if (username.includes('__')) return false;
    return true;
  }

  /**
   * Validates username format and availability.
   * Returns structured validation result for frontend consumption.
   */
  async validateUsername(username: string, userId?: string): Promise<ValidateUsernameResponse> {
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
      const isTaken = await this.usersRepository.isUsernameTaken(normalized, userId);
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
