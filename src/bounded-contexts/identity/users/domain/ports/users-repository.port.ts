/**
 * Users Repository Port
 *
 * Defines the abstraction for user data access operations.
 * Domain types — no infrastructure dependencies.
 */

import type { UpdateFullPreferences, UpdatePreferences, UpdateProfile } from '@/shared-kernel';

export const DigestFrequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  NEVER: 'NEVER',
} as const;
export type DigestFrequency = (typeof DigestFrequency)[keyof typeof DigestFrequency];

export type UserEntity = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  passwordHash: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  roles: string[];
  username: string | null;
  usernameUpdatedAt: Date | null;
  photoURL: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
  primaryResumeId: string | null;
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserPreferencesEntity = {
  id: string;
  userId: string;
  theme: string;
  palette: string;
  bannerColor: string | null;
  language: string;
  dateFormat: string;
  timezone: string;
  emailNotifications: boolean;
  resumeExpiryAlerts: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
  emailMilestones: boolean;
  emailShareExpiring: boolean;
  digestFrequency: DigestFrequency;
  profileVisibility: string;
  showEmail: boolean;
  showPhone: boolean;
  allowSearchEngineIndex: boolean;
  defaultExportFormat: string;
  includePhotoInExport: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserWithPreferences = UserEntity & {
  preferences: UserPreferencesEntity | null;
};

export abstract class UsersRepositoryPort {
  abstract findUserById(userId: string): Promise<UserEntity | null>;
  abstract findUserWithPreferencesById(userId: string): Promise<UserWithPreferences | null>;
  abstract findUserByUsername(username: string): Promise<UserWithPreferences | null>;
  abstract findUserProfileById(userId: string): Promise<Partial<UserEntity> | null>;
  abstract findUserPreferencesById(userId: string): Promise<Partial<UserEntity> | null>;
  abstract findFullUserPreferencesByUserId(userId: string): Promise<UserPreferencesEntity | null>;
  abstract isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean>;
  abstract findLastUsernameUpdateByUserId(userId: string): Promise<Date | null>;

  abstract createUserAccount(userData: {
    id: string;
    email: string;
    name?: string;
    photoURL?: string;
  }): Promise<UserEntity>;
  abstract updateUserAccount(userId: string, userData: Partial<UserEntity>): Promise<UserEntity>;
  abstract deleteUserAccount(userId: string): Promise<void>;
  abstract updateUserProfile(userId: string, profile: UpdateProfile): Promise<UserEntity>;
  abstract updateUserPreferences(userId: string, preferences: UpdatePreferences): Promise<void>;
  abstract upsertFullUserPreferences(
    userId: string,
    preferences: UpdateFullPreferences,
  ): Promise<UserPreferencesEntity>;
  abstract updatePalette(userId: string, palette: string): Promise<void>;
  abstract updateBannerColor(userId: string, bannerColor: string): Promise<void>;
  abstract updateUsername(userId: string, username: string): Promise<UserEntity>;
}
