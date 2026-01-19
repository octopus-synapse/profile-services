/**
 * User Preferences Service
 * Handles user preferences operations
 */

import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users.repository';
import {
  UpdatePreferences,
  UpdateFullPreferences,
  UserNotFoundError,
} from '@octopus-synapse/profile-contracts';
import { AppLoggerService } from '../../common/logger/logger.service';

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
      throw new UserNotFoundError(userId);
    }

    return userPreferences;
  }

  async updatePreferences(
    userId: string,
    updatePreferences: UpdatePreferences,
  ) {
    const existingUser = await this.usersRepository.findUserById(userId);
    if (!existingUser) {
      throw new UserNotFoundError(userId);
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
      throw new UserNotFoundError(userId);
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
