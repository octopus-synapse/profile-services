/**
 * User Profile Service
 * Handles profile-related operations
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../users.repository';
import { ResumesRepository } from '../../resumes/resumes.repository';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ERROR_MESSAGES } from '../../common/constants/app.constants';

@Injectable()
export class UserProfileService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly resumesRepository: ResumesRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async getPublicProfileByUsername(username: string) {
    const user = await this.usersRepository.findByUsername(username);

    if (!user || user.preferences?.profileVisibility !== 'public') {
      throw new NotFoundException(ERROR_MESSAGES.PUBLIC_PROFILE_NOT_FOUND);
    }

    const resume = await this.resumesRepository.findByUserId(user.id);

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

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const updatedUser = await this.usersRepository.updateUserProfile(
      userId,
      updateProfileDto,
    );

    this.logger.debug(`User profile updated`, 'UserProfileService', { userId });

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
}
