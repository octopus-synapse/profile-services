/**
 * Users Repository Facade
 * Delegates to specialized query and mutation repositories
 * Maintains backward compatibility with existing code
 */

import { Injectable } from '@nestjs/common';
import { User, UserPreferences } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateFullPreferencesDto } from './dto/update-full-preferences.dto';
import { UserQueryRepository, UserMutationRepository } from './repositories';

@Injectable()
export class UsersRepository {
  constructor(
    private readonly queryRepo: UserQueryRepository,
    private readonly mutationRepo: UserMutationRepository,
  ) {}

  // Query operations
  async getUser(userId: string): Promise<User | null> {
    return this.queryRepo.getUser(userId);
  }

  async getUserWithPreferences(
    userId: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    return this.queryRepo.getUserWithPreferences(userId);
  }

  async findByUsername(
    username: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    return this.queryRepo.findByUsername(username);
  }

  async getUserProfile(userId: string): Promise<Partial<User> | null> {
    return this.queryRepo.getUserProfile(userId);
  }

  async getUserPreferences(userId: string): Promise<Partial<User> | null> {
    return this.queryRepo.getUserPreferences(userId);
  }

  async getFullUserPreferences(
    userId: string,
  ): Promise<UserPreferences | null> {
    return this.queryRepo.getFullUserPreferences(userId);
  }

  async isUsernameTaken(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    return this.queryRepo.isUsernameTaken(username, excludeUserId);
  }

  async getLastUsernameUpdate(userId: string): Promise<Date | null> {
    return this.queryRepo.getLastUsernameUpdate(userId);
  }

  // Mutation operations
  async createUser(userData: {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }): Promise<User> {
    return this.mutationRepo.createUser(userData);
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    return this.mutationRepo.updateUser(userId, userData);
  }

  async deleteUser(userId: string): Promise<void> {
    return this.mutationRepo.deleteUser(userId);
  }

  async updateUserProfile(
    userId: string,
    profile: UpdateProfileDto,
  ): Promise<User> {
    return this.mutationRepo.updateUserProfile(userId, profile);
  }

  async updateUserPreferences(
    userId: string,
    preferences: UpdatePreferencesDto,
  ): Promise<void> {
    return this.mutationRepo.updateUserPreferences(userId, preferences);
  }

  async upsertFullUserPreferences(
    userId: string,
    preferences: UpdateFullPreferencesDto,
  ): Promise<UserPreferences> {
    return this.mutationRepo.upsertFullUserPreferences(userId, preferences);
  }

  async updatePalette(userId: string, palette: string): Promise<void> {
    return this.mutationRepo.updatePalette(userId, palette);
  }

  async updateBannerColor(userId: string, bannerColor: string): Promise<void> {
    return this.mutationRepo.updateBannerColor(userId, bannerColor);
  }

  async updateUsername(userId: string, username: string): Promise<User> {
    return this.mutationRepo.updateUsername(userId, username);
  }
}
