/**
 * User Preferences Service
 * Handles user preferences operations
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../users.repository';
import {
  UpdatePreferences,
  UpdateFullPreferences,
} from '@octopus-synapse/profile-contracts';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';

@Injectable()
export class UserPreferencesService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async getPreferences(userId: string) {
    const preferences = await this.usersRepository.getUserPreferences(userId);

    if (!preferences) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    updatePreferences: UpdatePreferences,
  ) {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
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
    const preferences =
      await this.usersRepository.getFullUserPreferences(userId);

    return preferences ?? {};
  }

  async updateFullPreferences(
    userId: string,
    updateFullPreferences: UpdateFullPreferences,
  ) {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
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
