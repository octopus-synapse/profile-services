/**
 * Route descriptors for the users BC. Replaces:
 * - `UsersProfileController`
 * - `UsersPreferencesController`
 * - `UserPermissionsController`
 * - `UserManagementController`
 *
 * The user-management endpoints use the synthesizer's dynamic
 * `{ resource, action }` permission spec (e.g. `('user', 'read')`)
 * since those permissions are not in the `Permission` enum.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { EmailSchema, PasswordSchema } from '@/shared-kernel/schemas/primitives';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { UsernameValidationErrorSchema } from '@/shared-kernel/schemas/user/user.schema';

extendZodWithOpenApi(z);

// ─── Response schemas ────────────────────────────────────────────────
// `UserProfile` from `application/ports/user-profile.port`. JSON-serialized
// `Date` becomes ISO string.
export const UserProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  github: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

// PATCH /v1/users/profile flattens the profile then nests it under `profile`
// (handler returns `{ ...result, profile: result }`).
export const UpdateUserProfileResponseSchema = UserProfileResponseSchema.extend({
  profile: UserProfileResponseSchema,
});

export const UpdateUsernameResponseSchema = z.object({
  username: z.string(),
  message: z.string(),
});

export const CheckUsernameResponseSchema = z.object({
  username: z.string(),
  available: z.boolean(),
  reason: z.enum(['taken', 'reserved', 'invalid_format']).optional(),
});

// POST /v1/users/username/validate — multi-error validation for client
// forms. Codes match `@packages/i18n/ERROR_DICTIONARY`; the route handler
// localizes each via `localizeDomainCodes` against `Accept-Language` so
// the `message` field is always pre-translated.
export const ValidateUsernameRequestBodySchema = z
  .object({
    username: z.string(),
  })
  .openapi({
    example: {
      username: 'johndoe',
    },
  });

export const ValidateUsernameResponseSchema = z.object({
  username: z.string(),
  valid: z.boolean(),
  available: z.boolean().optional(),
  errors: z.array(UsernameValidationErrorSchema),
});

export const BasicPreferencesShape = z.object({
  theme: z.string().optional(),
  language: z.string().optional(),
  emailNotifications: z.boolean().optional(),
});
export const GetBasicPreferencesResponseSchema = z.object({ preferences: BasicPreferencesShape });

export const UpdateBasicPreferencesResponseSchema = z.object({ message: z.string() });

export const PermissionsListResponseSchema = z.object({ permissions: z.array(z.string()) });

export const MessageOnlyResponseSchema = z.object({ message: z.string() });

// View-model emitted by `toUserManagementListData` — Dates pre-serialized.
export const ManagedUserListItemSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  image: z.string().nullable(),
  emailVerified: IsoDateTimeSchema.nullable(),
  resumeCount: z.number().int(),
  role: z.enum(['USER', 'ADMIN']),
  isActive: z.boolean(),
  lastLoginAt: IsoDateTimeSchema.nullable(),
});

export const ManagedUserListResponseSchema = z.object({
  items: z.array(ManagedUserListItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const ManagedUserResumeItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  isPublic: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

// `UserDetails.preferences` is `unknown | null` in the port; the FullUserPreferences
// shape is what we serialize on the read path. Express it as a permissive
// passthrough record so we stay schema-driven without falling back to
// `z.unknown()`.
export const ManagedUserDetailsResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    username: z.string().nullable(),
    hasCompletedOnboarding: z.boolean(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    image: z.string().nullable(),
    emailVerified: IsoDateTimeSchema.nullable(),
    isActive: z.boolean(),
    lastLoginAt: IsoDateTimeSchema.nullable(),
    roles: z.array(z.string()),
    resumes: z.array(ManagedUserResumeItemSchema),
    preferences: z.record(z.string(), z.unknown()).nullable(),
    counts: z.object({
      accounts: z.number().int(),
      sessions: z.number().int(),
      resumes: z.number().int(),
    }),
  }),
});

export const CreatedUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});

export const UpdatedManagedUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  updatedAt: IsoDateTimeSchema,
});

export const CreatedUserResponseSchema = z.object({
  user: CreatedUserSchema,
  message: z.string(),
});

export const UpdatedUserResponseSchema = z.object({
  user: UpdatedManagedUserSchema,
  message: z.string(),
});

export const UsernameParam = z
  .object({ username: z.string() })
  .openapi({ example: { username: 'janedoe' } });
export const CheckUsernameQuery = z
  .object({ username: z.string() })
  .openapi({ example: { username: 'janedoe' } });

// Public users listing — used by the SEO sitemap. No auth.
export const PublicUserItemSchema = z.object({
  username: z.string(),
  updatedAt: IsoDateTimeSchema,
});

export const PublicUsersListResponseSchema = z.object({
  items: z.array(PublicUserItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const PublicUsersListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const UserIdParam = IdParamSchema;

export const ListUsersQuery = z.object({
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
  search: z.string().optional(),
  roleName: z.string().optional(),
});

export const AdminCreateUserSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    name: z.string().optional(),
    role: z.enum(['USER', 'ADMIN']).default('USER').optional(),
  })
  .openapi({
    example: {
      email: 'new.user@example.com',
      password: 'SecurePass123!',
      name: 'Jane Doe',
      role: 'USER',
    },
  });

export const AdminUpdateUserSchema = z
  .object({
    email: EmailSchema.optional(),
    name: z.string().optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    isActive: z.boolean().optional(),
    isEmailVerified: z.boolean().optional(),
  })
  .openapi({
    example: {
      name: 'Jane Doe',
      isActive: true,
    },
  });

export const AdminResetPasswordSchema = z.object({ newPassword: PasswordSchema }).openapi({
  example: {
    newPassword: 'NewSecurePass456!',
  },
});

export const AssignRolesSchema = z.object({ roles: z.array(z.string()) }).openapi({
  example: {
    roles: ['role_user'],
  },
});

// ─── One-Click Apply config (F3-PD-009a) ─────────────────────────────
export const OneClickApplyConfigSchema = z
  .object({
    enabled: z.boolean(),
    resumeId: z.string().uuid(),
    coverLetterTemplate: z.string().max(8000),
    tailoringMode: z.enum(['VERBATIM', 'AI_TAILOR']),
    alsoAttach: z.object({
      githubUrl: z.boolean(),
      linkedinUrl: z.boolean(),
    }),
  })
  .openapi({
    description: 'Auto-apply preferences for the candidate UI.',
    example: {
      enabled: true,
      resumeId: '01900000-0000-7000-a000-000000000010',
      coverLetterTemplate: 'Olá, equipe {{job.company}}!\nVi a vaga de {{job.title}}...',
      tailoringMode: 'AI_TAILOR',
      alsoAttach: { githubUrl: true, linkedinUrl: true },
    },
  });

export const OneClickApplyConfigResponseSchema = z.object({
  data: OneClickApplyConfigSchema.nullable(),
});
