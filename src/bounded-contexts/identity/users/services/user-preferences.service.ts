/**
 * User Preferences Service
 * Handles user preferences operations
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '@/bounded-contexts/identity/users/users.repository';
import {
  UpdatePreferences,
  UpdateFullPreferences,
} from '@/shared-kernel';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { ERROR_MESSAGES } from '@/shared-kernel';

@Injectable()
export class UserPreferencesService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async getPreferences(userId: string) {
    const userPreferences =
      await this.usersRepository.findUserPreferencesById(userId);

    if (!userPreferences) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return userPreferences;
  }

  async updatePreferences(
    userId: string,
    updatePreferences: UpdatePreferences,
  ) {
    const existingUser = await this.usersRepository.findUserById(userId);
    if (!existingUser) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    await this.usersRepository.updateUserPreferences(userId, updatePreferences);

    this.logger.debug(`User preferences updated`, 'UserPreferencesService', {
      userId,
    });

    return {
      success: true,
      message: 'Preferences updated successfully',
    };
  }

  async getFullPreferences(userId: string) {
    const fullUserPreferences =
      await this.usersRepository.findFullUserPreferencesByUserId(userId);

    return fullUserPreferences ?? {};
  }

  async updateFullPreferences(
    userId: string,
    updateFullPreferences: UpdateFullPreferences,
  ) {
    const existingUser = await this.usersRepository.findUserById(userId);
    if (!existingUser) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const preferences = await this.usersRepository.upsertFullUserPreferences(
      userId,
      updateFullPreferences,
    );

    this.logger.debug(
      `User full preferences updated`,
      'UserPreferencesService',
      {
        userId,
      },
    );

    return {
      success: true,
      preferences,
    };
  }
}
