/**
 * Users Service - Facade
 * Delegates to specialized services for profile, preferences, and username
 */

import { Injectable } from '@nestjs/common';
import type {
  UpdateFullPreferences,
  UpdatePreferences,
  UpdateProfile,
  UpdateUsername,
} from '@/shared-kernel';
import { UserPreferencesService } from './services/user-preferences.service';
import { UserProfileService } from './services/user-profile.service';
import { UsernameService } from './services/username.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly profileService: UserProfileService,
    private readonly preferencesService: UserPreferencesService,
    private readonly usernameService: UsernameService,
  ) {}

  // Profile operations
  async getPublicProfileByUsername(username: string) {
    return this.profileService.getPublicProfileByUsername(username);
  }

  async getProfile(userId: string) {
    return this.profileService.getProfile(userId);
  }

  async updateProfile(userId: string, updateProfile: UpdateProfile) {
    return this.profileService.updateProfile(userId, updateProfile);
  }

  // Preferences operations
  async getPreferences(userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  async updatePreferences(userId: string, updatePreferences: UpdatePreferences) {
    return this.preferencesService.updatePreferences(userId, updatePreferences);
  }

  async getFullPreferences(userId: string) {
    return this.preferencesService.getFullPreferences(userId);
  }

  async updateFullPreferences(userId: string, updateFullPreferences: UpdateFullPreferences) {
    return this.preferencesService.updateFullPreferences(userId, updateFullPreferences);
  }

  // Username operations
  async updateUsername(userId: string, updateUsername: UpdateUsername) {
    return this.usernameService.updateUsername(userId, updateUsername);
  }

  async checkUsernameAvailability(username: string, userId?: string) {
    return this.usernameService.checkUsernameAvailability(username, userId);
  }

  async validateUsername(username: string, userId?: string) {
    return this.usernameService.validateUsername(username, userId);
  }
}
