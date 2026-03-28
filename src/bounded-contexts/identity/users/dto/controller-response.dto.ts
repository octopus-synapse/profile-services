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

const PublicProfileDataSchema = z.object({
  user: z.record(z.unknown()),
  resume: z.record(z.unknown()).nullable(),
});

const UserProfileDataSchema = z.object({
  profile: z.record(z.unknown()),
});

const UsernameUpdateDataSchema = z.object({
  username: z.string().nullable(),
  message: z.string(),
});

const UsernameAvailabilityDataSchema = z.object({
  username: z.string(),
  available: z.boolean(),
});

const UserPreferencesDataSchema = z.object({
  preferences: z.record(z.unknown()),
});

const UserFullPreferencesDataSchema = z.object({
  preferences: z.record(z.unknown()),
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
export class PublicProfileDataDto extends createZodDto(PublicProfileDataSchema) {}
export class UserProfileDataDto extends createZodDto(UserProfileDataSchema) {}
export class UsernameUpdateDataDto extends createZodDto(UsernameUpdateDataSchema) {}
export class UsernameAvailabilityDataDto extends createZodDto(UsernameAvailabilityDataSchema) {}
export class UserPreferencesDataDto extends createZodDto(UserPreferencesDataSchema) {}
export class UserFullPreferencesDataDto extends createZodDto(UserFullPreferencesDataSchema) {}
