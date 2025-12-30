/**
 * Users Service - Facade
 * Delegates to specialized services for profile, preferences, and username
 */

import { Injectable } from '@nestjs/common';
import { UserProfileService } from './services/user-profile.service';
import { UserPreferencesService } from './services/user-preferences.service';
import { UsernameService } from './services/username.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateFullPreferencesDto } from './dto/update-full-preferences.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';

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

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    return this.profileService.updateProfile(userId, updateProfileDto);
  }

  // Preferences operations
  async getPreferences(userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(
      userId,
      updatePreferencesDto,
    );
  }

  async getFullPreferences(userId: string) {
    return this.preferencesService.getFullPreferences(userId);
  }

  async updateFullPreferences(
    userId: string,
    updateFullPreferencesDto: UpdateFullPreferencesDto,
  ) {
    return this.preferencesService.updateFullPreferences(
      userId,
      updateFullPreferencesDto,
    );
  }

  // Username operations
  async updateUsername(userId: string, updateUsernameDto: UpdateUsernameDto) {
    return this.usernameService.updateUsername(userId, updateUsernameDto);
  }

  async checkUsernameAvailability(username: string, userId?: string) {
    return this.usernameService.checkUsernameAvailability(username, userId);
  }
}
