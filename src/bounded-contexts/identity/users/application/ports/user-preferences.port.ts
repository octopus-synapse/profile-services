/**
 * User Preferences Port
 *
 * Defines domain types and repository abstraction for user preferences.
 * Types match the Prisma UserPreferences model.
 */

// ============================================================================
// Domain Types
// ============================================================================

export type UserPreferences = { theme?: string; language?: string; emailNotifications?: boolean };

export type ApplyMode = 'ONE_CLICK' | 'WEEKLY_CURATED' | 'AUTO_APPLY';

export type UserApplyCriteriaData = {
  minFit: number | null;
  stacks: string[];
  seniorities: string[];
  remotePolicies: Array<'REMOTE' | 'HYBRID' | 'ONSITE'>;
  paymentCurrencies: Array<'BRL' | 'USD' | 'EUR' | 'GBP'>;
  minSalaryUsd: number | null;
  defaultCover: string | null;
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
  profileVisibility: 'PUBLIC' | 'RECRUITERS_ONLY' | 'PRIVATE';
  messagePrivacy: 'EVERYONE' | 'RECRUITERS_ONLY' | 'NOBODY';
  showEmail: boolean;
  showPhone: boolean;
  allowSearchEngineIndex: boolean;
  defaultExportFormat: string;
  includePhotoInExport: boolean;
  applyMode: ApplyMode;
  applyCriteria: UserApplyCriteriaData | null;
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
  Omit<FullUserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'applyCriteria'>
> & {
  /** Partial patch on the criteria row; missing keys leave existing values as-is. */
  applyCriteria?: Partial<UserApplyCriteriaData>;
};

export type OneClickApplyConfig = {
  enabled: boolean;
  resumeId: string;
  coverLetterTemplate: string;
  tailoringMode: 'VERBATIM' | 'AI_TAILOR';
  alsoAttach: { githubUrl: boolean; linkedinUrl: boolean };
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class UserPreferencesRepositoryPort {
  abstract userExists(userId: string): Promise<boolean>;

  abstract findPreferences(userId: string): Promise<UserPreferences | null>;

  abstract updatePreferences(userId: string, data: UpdatePreferencesData): Promise<void>;

  abstract findFullPreferences(userId: string): Promise<FullUserPreferences | null>;

  abstract upsertFullPreferences(
    userId: string,
    data: UpdateFullPreferencesData,
  ): Promise<FullUserPreferences>;

  abstract findOneClickApplyConfig(userId: string): Promise<OneClickApplyConfig | null>;

  abstract upsertOneClickApplyConfig(
    userId: string,
    config: OneClickApplyConfig,
  ): Promise<OneClickApplyConfig>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class UserPreferencesUseCases {
  abstract readonly getPreferencesUseCase: {
    execute: (userId: string) => Promise<UserPreferences>;
  };
  abstract readonly updatePreferencesUseCase: {
    execute: (userId: string, data: UpdatePreferencesData) => Promise<void>;
  };
  abstract readonly getFullPreferencesUseCase: {
    execute: (userId: string) => Promise<FullUserPreferences | Record<string, never>>;
  };
  abstract readonly updateFullPreferencesUseCase: {
    execute: (userId: string, data: UpdateFullPreferencesData) => Promise<FullUserPreferences>;
  };
  abstract readonly getOneClickApplyConfigUseCase: {
    execute: (userId: string) => Promise<OneClickApplyConfig | null>;
  };
  abstract readonly updateOneClickApplyConfigUseCase: {
    execute: (userId: string, config: OneClickApplyConfig) => Promise<OneClickApplyConfig>;
  };
}
