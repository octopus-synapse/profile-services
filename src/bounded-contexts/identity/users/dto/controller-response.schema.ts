import { z } from 'zod';

// ============================================================================
// Pagination
// ============================================================================

const PaginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

// ============================================================================
// User List
// ============================================================================

const UserListItemSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  image: z.string().nullable(),
  emailVerified: z.string().datetime().nullable(),
  resumeCount: z.number().int(),
  role: z.enum(['USER', 'ADMIN']),
  isActive: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
});

const UserManagementListDataSchema = z.object({
  users: z.array(UserListItemSchema),
  pagination: PaginationMetaSchema,
});

// ============================================================================
// User Details
// ============================================================================

const UserResumeItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  isPublic: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const UserCountsSchema = z.object({
  accounts: z.number().int(),
  sessions: z.number().int(),
  resumes: z.number().int(),
});

const UserDetailsSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  image: z.string().nullable(),
  emailVerified: z.string().datetime().nullable(),
  isActive: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
  roles: z.array(z.string()),
  resumes: z.array(UserResumeItemSchema),
  preferences: z.unknown().nullable(),
  counts: UserCountsSchema,
});

const UserDetailsDataSchema = z.object({ user: UserDetailsSchema });

// ============================================================================
// User Mutations
// ============================================================================

const CreatedUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const UpdatedUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  updatedAt: z.string().datetime(),
});

const UserMutationDataSchema = z.object({
  user: z.union([CreatedUserSchema, UpdatedUserSchema]),
  message: z.string(),
});

const UserOperationMessageDataSchema = z.object({ message: z.string() });

// ============================================================================
// Profile & Preferences
// ============================================================================

const PublicProfileUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().nullable(),
  photoURL: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
});

const PublicProfileResumeSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  language: z.string(),
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  website: z.string().nullable(),
  summary: z.string().nullable(),
  accentColor: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PublicProfileDataSchema = z.object({
  user: PublicProfileUserSchema,
  resume: PublicProfileResumeSchema.nullable(),
});

const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  github: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const UserProfileDataSchema = z.object({ profile: UserProfileSchema });

const UsernameUpdateDataSchema = z.object({ username: z.string().nullable(), message: z.string() });

const UsernameAvailabilityDataSchema = z.object({
  username: z.string(),
  available: z.boolean(),
  reason: z.enum(['taken', 'reserved', 'invalid_format']).optional(),
});

const BasicUserPreferencesSchema = z.object({
  theme: z.string().optional(),
  language: z.string().optional(),
  emailNotifications: z.boolean().optional(),
});

const UserApplyCriteriaSchema = z.object({
  minFit: z.number().int().min(0).max(100).nullable(),
  stacks: z.array(z.string()),
  seniorities: z.array(z.string()),
  remotePolicies: z.array(z.enum(['REMOTE', 'HYBRID', 'ONSITE'])),
  paymentCurrencies: z.array(z.enum(['BRL', 'USD', 'EUR', 'GBP'])),
  minSalaryUsd: z.number().int().nullable(),
  defaultCover: z.string().nullable(),
});

const FullUserPreferencesSchema = z.object({
  id: z.string(),
  userId: z.string(),
  theme: z.string(),
  palette: z.string(),
  bannerColor: z.string().nullable(),
  language: z.string(),
  dateFormat: z.string(),
  timezone: z.string(),
  emailNotifications: z.boolean(),
  resumeExpiryAlerts: z.boolean(),
  weeklyDigest: z.boolean(),
  marketingEmails: z.boolean(),
  emailMilestones: z.boolean(),
  emailShareExpiring: z.boolean(),
  digestFrequency: z.string(),
  profileVisibility: z.string(),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  allowSearchEngineIndex: z.boolean(),
  defaultExportFormat: z.string(),
  includePhotoInExport: z.boolean(),
  applyMode: z.enum(['ONE_CLICK', 'WEEKLY_CURATED', 'AUTO_APPLY']),
  applyCriteria: UserApplyCriteriaSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const UserPreferencesDataSchema = z.object({ preferences: BasicUserPreferencesSchema });

export const UserFullPreferencesDataSchema = z.object({ preferences: FullUserPreferencesSchema });

// ============================================================================
// DTOs
// ============================================================================

export type PublicProfileDataDto = z.infer<typeof PublicProfileDataSchema>;

export type UserFullPreferencesDataDto = z.infer<typeof UserFullPreferencesDataSchema>;

export type PaginationMetaDto = z.infer<typeof PaginationMetaSchema>;

export type UserListItemDto = z.infer<typeof UserListItemSchema>;

export type UserManagementListDataDto = z.infer<typeof UserManagementListDataSchema>;

export type UserResumeItemDto = z.infer<typeof UserResumeItemSchema>;

export type UserCountsDto = z.infer<typeof UserCountsSchema>;

export type UserDetailsDto = z.infer<typeof UserDetailsSchema>;

export type UserDetailsDataDto = z.infer<typeof UserDetailsDataSchema>;

export type CreatedUserDto = z.infer<typeof CreatedUserSchema>;

export type UpdatedUserDto = z.infer<typeof UpdatedUserSchema>;

export type UserMutationDataDto = z.infer<typeof UserMutationDataSchema>;

export type UserOperationMessageDataDto = z.infer<typeof UserOperationMessageDataSchema>;

export type PublicProfileUserDto = z.infer<typeof PublicProfileUserSchema>;

export type PublicProfileResumeDto = z.infer<typeof PublicProfileResumeSchema>;

export type UserProfileDto = z.infer<typeof UserProfileSchema>;

export type UserProfileDataDto = z.infer<typeof UserProfileDataSchema>;

export type UsernameUpdateDataDto = z.infer<typeof UsernameUpdateDataSchema>;

export type UsernameAvailabilityDataDto = z.infer<typeof UsernameAvailabilityDataSchema>;

export type BasicUserPreferencesDto = z.infer<typeof BasicUserPreferencesSchema>;

export type UserApplyCriteriaDto = z.infer<typeof UserApplyCriteriaSchema>;

export type FullUserPreferencesDto = z.infer<typeof FullUserPreferencesSchema>;

export type UserPreferencesDataDto = z.infer<typeof UserPreferencesDataSchema>;
