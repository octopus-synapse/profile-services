/**
 * User Profile Service
 * Handles profile-related operations
 */

import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users.repository';
import { ResumesRepository } from '../../resumes/resumes.repository';
import type { UpdateUser as UpdateProfile } from '@octopus-synapse/profile-contracts';
import { AppLoggerService } from '../../common/logger/logger.service';
import {
  ResourceNotFoundError,
  UserNotFoundError,
} from '@octopus-synapse/profile-contracts';

@Injectable()
export class UserProfileService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly resumesRepository: ResumesRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async getPublicProfileByUsername(username: string) {
    const foundUser = await this.usersRepository.findUserByUsername(username);

    if (!foundUser || foundUser.preferences?.profileVisibility !== 'public') {
      throw new ResourceNotFoundError('Public profile', username);
    }

    const userResume = await this.resumesRepository.findResumeByUserId(
      foundUser.id,
    );

    const publicProfileData = {
      user: {
        displayName: foundUser.displayName,
        photoURL: foundUser.photoURL,
        bio: foundUser.bio,
        location: foundUser.location,
        website: foundUser.website,
        linkedin: foundUser.linkedin,
        github: foundUser.github,
      },
      resume: userResume,
    };

    return publicProfileData;
  }

  async getProfile(userId: string) {
    const profile = await this.usersRepository.findUserProfileById(userId);

    if (!profile) {
      throw new UserNotFoundError(userId);
    }

    return profile;
  }

  async updateProfile(userId: string, profileUpdateData: UpdateProfile) {
    const existingUser = await this.usersRepository.findUserById(userId);
    if (!existingUser) {
      throw new UserNotFoundError(userId);
    }

    const updatedUserProfile = await this.usersRepository.updateUserProfile(
      userId,
      profileUpdateData,
    );

    this.logger.debug(`User profile updated`, 'UserProfileService', { userId });

    const updatedProfileResponse = {
      success: true,
      user: {
        displayName: updatedUserProfile.displayName,
        photoURL: updatedUserProfile.photoURL,
        bio: updatedUserProfile.bio,
        location: updatedUserProfile.location,
        phone: updatedUserProfile.phone,
        website: updatedUserProfile.website,
        linkedin: updatedUserProfile.linkedin,
        github: updatedUserProfile.github,
      },
    };

    return updatedProfileResponse;
  }
}
