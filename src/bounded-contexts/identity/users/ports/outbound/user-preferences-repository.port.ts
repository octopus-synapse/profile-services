/**
 * User Preferences Repository Port
 *
 * Defines the abstraction for user preferences operations.
 */

import type {
  FullUserPreferences,
  UpdateFullPreferencesData,
  UpdatePreferencesData,
  UserPreferences,
} from '../../domain/types';

export abstract class UserPreferencesRepositoryPort {
  abstract userExists(userId: string): Promise<boolean>;

  abstract findPreferences(userId: string): Promise<UserPreferences | null>;

  abstract updatePreferences(userId: string, data: UpdatePreferencesData): Promise<void>;

  abstract findFullPreferences(userId: string): Promise<FullUserPreferences | null>;

  abstract upsertFullPreferences(
    userId: string,
    data: UpdateFullPreferencesData,
  ): Promise<FullUserPreferences>;
}
