/**
 * User Management Response DTOs
 *
 * Uses createZodDto for unified TS types + validation + Swagger docs.
 */

import { createZodDto } from 'nestjs-zod';
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
  template: z.string().nullable(),
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
  resumes: z.array(UserResumeItemSchema),
  preferences: z.unknown().nullable(),
  counts: UserCountsSchema,
});

const UserDetailsDataSchema = z.object({
  user: UserDetailsSchema,
});

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

const UserOperationMessageDataSchema = z.object({
  message: z.string(),
});

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
  template: z.string(),
  language: z.string(),
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  emailContact: z.string().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  website: z.string().nullable(),
  summary: z.string().nullable(),
  accentColor: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const PublicProfileDataSchema = z.object({
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

const UserProfileDataSchema = z.object({
  profile: UserProfileSchema,
});

const UsernameUpdateDataSchema = z.object({
  username: z.string().nullable(),
  message: z.string(),
});

const UsernameAvailabilityDataSchema = z.object({
  username: z.string(),
  available: z.boolean(),
});

const BasicUserPreferencesSchema = z.object({
  theme: z.string().optional(),
  language: z.string().optional(),
  emailNotifications: z.boolean().optional(),
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
  createdAt: z.date(),
  updatedAt: z.date(),
});

const UserPreferencesDataSchema = z.object({
  preferences: BasicUserPreferencesSchema,
});

const UserFullPreferencesDataSchema = z.object({
  preferences: FullUserPreferencesSchema,
});

// ============================================================================
// DTOs
// ============================================================================

export class PaginationMetaDto extends createZodDto(PaginationMetaSchema) {}
export class UserListItemDto extends createZodDto(UserListItemSchema) {}
export class UserManagementListDataDto extends createZodDto(UserManagementListDataSchema) {}
export class UserResumeItemDto extends createZodDto(UserResumeItemSchema) {}
export class UserCountsDto extends createZodDto(UserCountsSchema) {}
export class UserDetailsDto extends createZodDto(UserDetailsSchema) {}
export class UserDetailsDataDto extends createZodDto(UserDetailsDataSchema) {}
export class CreatedUserDto extends createZodDto(CreatedUserSchema) {}
export class UpdatedUserDto extends createZodDto(UpdatedUserSchema) {}
export class UserMutationDataDto extends createZodDto(UserMutationDataSchema) {}
export class UserOperationMessageDataDto extends createZodDto(UserOperationMessageDataSchema) {}
export class PublicProfileUserDto extends createZodDto(PublicProfileUserSchema) {}
export class PublicProfileResumeDto extends createZodDto(PublicProfileResumeSchema) {}
export class PublicProfileDataDto extends createZodDto(PublicProfileDataSchema) {}
export class UserProfileDto extends createZodDto(UserProfileSchema) {}
export class UserProfileDataDto extends createZodDto(UserProfileDataSchema) {}
export class UsernameUpdateDataDto extends createZodDto(UsernameUpdateDataSchema) {}
export class UsernameAvailabilityDataDto extends createZodDto(UsernameAvailabilityDataSchema) {}
export class BasicUserPreferencesDto extends createZodDto(BasicUserPreferencesSchema) {}
export class FullUserPreferencesDto extends createZodDto(FullUserPreferencesSchema) {}
export class UserPreferencesDataDto extends createZodDto(UserPreferencesDataSchema) {}
export class UserFullPreferencesDataDto extends createZodDto(UserFullPreferencesDataSchema) {}
