/**
 * User Preferences Domain Types
 *
 * Domain types for user preferences operations.
 */

export type UserPreferences = {
  theme?: string;
  language?: string;
  emailNotifications?: boolean;
};

export type FullUserPreferences = {
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
  digestFrequency: string;
  profileVisibility: string;
  showEmail: boolean;
  showPhone: boolean;
  allowSearchEngineIndex: boolean;
  defaultExportFormat: string;
  includePhotoInExport: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdatePreferencesData = {
  name?: string;
  photoURL?: string;
  palette?: string;
  bannerColor?: string;
};

export type UpdateFullPreferencesData = Partial<
  Omit<FullUserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

// Use Cases Interface Symbol
export const USER_PREFERENCES_USE_CASES = Symbol('USER_PREFERENCES_USE_CASES');

export interface UserPreferencesUseCases {
  getPreferencesUseCase: {
    execute: (userId: string) => Promise<UserPreferences>;
  };
  updatePreferencesUseCase: {
    execute: (userId: string, data: UpdatePreferencesData) => Promise<void>;
  };
  getFullPreferencesUseCase: {
    execute: (userId: string) => Promise<FullUserPreferences | Record<string, never>>;
  };
  updateFullPreferencesUseCase: {
    execute: (userId: string, data: UpdateFullPreferencesData) => Promise<FullUserPreferences>;
  };
}
