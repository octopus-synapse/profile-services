/**
 * User Preferences Service
 * Handles user preferences operations
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../users.repository';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { UpdateFullPreferencesDto } from '../dto/update-full-preferences.dto';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ERROR_MESSAGES } from '../../common/constants/config';

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
    updatePreferencesDto: UpdatePreferencesDto,
  ) {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    await this.usersRepository.updateUserPreferences(
      userId,
      updatePreferencesDto,
    );

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
    updateFullPreferencesDto: UpdateFullPreferencesDto,
  ) {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const preferences = await this.usersRepository.upsertFullUserPreferences(
      userId,
      updateFullPreferencesDto,
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
