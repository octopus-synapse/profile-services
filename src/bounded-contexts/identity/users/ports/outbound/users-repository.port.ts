/**
 * Users Repository Port
 *
 * Defines the abstraction for user data access operations.
 * This is the primary port for user-related queries and mutations.
 */

import type { User, UserPreferences } from '@prisma/client';

export type UserWithPreferences = User & {
  preferences: UserPreferences | null;
};

export abstract class UsersRepositoryPort {
  // Query operations
  abstract findUserById(userId: string): Promise<User | null>;
  abstract findUserWithPreferencesById(userId: string): Promise<UserWithPreferences | null>;
  abstract findUserByUsername(username: string): Promise<UserWithPreferences | null>;
  abstract findUserProfileById(userId: string): Promise<Partial<User> | null>;
  abstract findUserPreferencesById(userId: string): Promise<Partial<User> | null>;
  abstract findFullUserPreferencesByUserId(userId: string): Promise<UserPreferences | null>;
  abstract isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean>;
  abstract findLastUsernameUpdateByUserId(userId: string): Promise<Date | null>;

  // Mutation operations
  abstract createUserAccount(userData: {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }): Promise<User>;
  abstract updateUserAccount(userId: string, userData: Partial<User>): Promise<User>;
  abstract deleteUserAccount(userId: string): Promise<void>;
  abstract updateUserProfile(
    userId: string,
    profile: { name?: string; image?: string; email?: string },
  ): Promise<User>;
  abstract updateUserPreferences(
    userId: string,
    preferences: {
      theme?: string;
      language?: string;
      emailNotifications?: boolean;
    },
  ): Promise<void>;
  abstract upsertFullUserPreferences(
    userId: string,
    preferences: Record<string, unknown>,
  ): Promise<UserPreferences>;
  abstract updatePalette(userId: string, palette: string): Promise<void>;
  abstract updateBannerColor(userId: string, bannerColor: string): Promise<void>;
  abstract updateUsername(userId: string, username: string): Promise<User>;
}
