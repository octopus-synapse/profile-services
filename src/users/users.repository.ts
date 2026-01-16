/**
 * Users Repository Facade
 * Delegates to specialized query and mutation repositories
 * Maintains backward compatibility with existing code
 */

import { Injectable } from '@nestjs/common';
import { User, UserPreferences } from '@prisma/client';
import type {
  UpdateProfile,
  UpdatePreferences,
  UpdateFullPreferences,
} from '@octopus-synapse/profile-contracts';
import { UserQueryRepository, UserMutationRepository } from './repositories';

@Injectable()
export class UsersRepository {
  constructor(
    private readonly queryRepo: UserQueryRepository,
    private readonly mutationRepo: UserMutationRepository,
  ) {}

  // Query operations
  async findUserById(userId: string): Promise<User | null> {
    return this.queryRepo.findUserById(userId);
  }

  async findUserWithPreferencesById(
    userId: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    return this.queryRepo.findUserWithPreferencesById(userId);
  }

  async findUserByUsername(
    username: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    return this.queryRepo.findUserByUsername(username);
  }

  async findUserProfileById(userId: string): Promise<Partial<User> | null> {
    return this.queryRepo.findUserProfileById(userId);
  }

  async findUserPreferencesById(userId: string): Promise<Partial<User> | null> {
    return this.queryRepo.findUserPreferencesById(userId);
  }

  async findFullUserPreferencesByUserId(
    userId: string,
  ): Promise<UserPreferences | null> {
    return this.queryRepo.findFullUserPreferencesByUserId(userId);
  }

  async isUsernameTaken(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    return this.queryRepo.isUsernameTaken(username, excludeUserId);
  }

  async findLastUsernameUpdateByUserId(userId: string): Promise<Date | null> {
    return this.queryRepo.findLastUsernameUpdateByUserId(userId);
  }

  // Mutation operations
  async createUserAccount(userData: {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }): Promise<User> {
    return this.mutationRepo.createUserAccount(userData);
  }

  async updateUserAccount(
    userId: string,
    userData: Partial<User>,
  ): Promise<User> {
    return this.mutationRepo.updateUserAccount(userId, userData);
  }

  async deleteUserAccount(userId: string): Promise<void> {
    return this.mutationRepo.deleteUserAccount(userId);
  }

  async updateUserProfile(
    userId: string,
    profile: UpdateProfile,
  ): Promise<User> {
    return this.mutationRepo.updateUserProfile(userId, profile);
  }

  async updateUserPreferences(
    userId: string,
    preferences: UpdatePreferences,
  ): Promise<void> {
    return this.mutationRepo.updateUserPreferences(userId, preferences);
  }

  async upsertFullUserPreferences(
    userId: string,
    preferences: UpdateFullPreferences,
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
