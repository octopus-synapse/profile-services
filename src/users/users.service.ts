import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { ResumesRepository } from '../resumes/resumes.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateFullPreferencesDto } from './dto/update-full-preferences.dto';
import { AppLoggerService } from '../common/logger/logger.service';
import { ERROR_MESSAGES } from '../common/constants/app.constants';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly resumesRepository: ResumesRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async getPublicProfileByUsername(username: string) {
    const user = await this.usersRepository.findByUsername(username);

    if (
      !user ||
      !user.preferences ||
      user.preferences.profileVisibility !== 'public'
    ) {
      throw new NotFoundException('Public profile not found');
    }

    const resume = await this.resumesRepository.findByUserId(user.id);

    // Return a curated public profile object
    return {
      user: {
        displayName: user.displayName,
        photoURL: user.photoURL,
        bio: user.bio,
        location: user.location,
        website: user.website,
        linkedin: user.linkedin,
        github: user.github,
      },
      resume,
    };
  }

  async getProfile(userId: string) {
    const profile = await this.usersRepository.getUserProfile(userId);

    if (!profile) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return profile;
  }

  // ... (rest of the file is unchanged)
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const updatedUser = await this.usersRepository.updateUserProfile(
      userId,
      updateProfileDto,
    );

    this.logger.debug(`User profile updated`, 'UsersService', { userId });

    return {
      success: true,
      user: {
        displayName: updatedUser.displayName,
        photoURL: updatedUser.photoURL,
        bio: updatedUser.bio,
        location: updatedUser.location,
        phone: updatedUser.phone,
        website: updatedUser.website,
        linkedin: updatedUser.linkedin,
        github: updatedUser.github,
      },
    };
  }

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

    this.logger.debug(`User preferences updated`, 'UsersService', { userId });

    return {
      success: true,
      message: 'Preferences updated successfully',
    };
  }

  async getFullPreferences(userId: string) {
    const preferences =
      await this.usersRepository.getFullUserPreferences(userId);

    return preferences || {};
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

    this.logger.debug(`User full preferences updated`, 'UsersService', {
      userId,
    });

    return {
      success: true,
      preferences,
    };
  }
}
