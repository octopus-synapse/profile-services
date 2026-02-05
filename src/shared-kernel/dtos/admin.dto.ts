import { z } from 'zod';
import { EmailSchema, PasswordSchema } from '../schemas/primitives';
import { UserRoleSchema } from '../enums/user-role.enum';

const FullNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100);

export const AdminCreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: FullNameSchema.optional(),
  role: UserRoleSchema.default('USER'),
});

export type AdminCreateUser = z.infer<typeof AdminCreateUserSchema>;

export const AdminUpdateUserSchema = z.object({
  email: EmailSchema.optional(),
  name: FullNameSchema.optional(),
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
});

export type AdminUpdateUser = z.infer<typeof AdminUpdateUserSchema>;

export const AdminResetPasswordSchema = z.object({
  newPassword: PasswordSchema,
});

export type AdminResetPassword = z.infer<typeof AdminResetPasswordSchema>;

export const AdminUserQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'APPROVER']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AdminUserQuery = z.infer<typeof AdminUserQuerySchema>;

export const AdminUpdateRoleRequestSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export type AdminUpdateRoleRequest = z.infer<
  typeof AdminUpdateRoleRequestSchema
>;

import { UserSchema } from '../types/user.types';

export const AdminUserListItemSchema = UserSchema.extend({
  resumeCount: z.number().int().min(0),
  lastLoginAt: z.string().datetime().nullable(),
});

export type AdminUserListItem = z.infer<typeof AdminUserListItemSchema>;

export const PaginatedUsersSchema = z.object({
  users: z.array(AdminUserListItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export type PaginatedUsers = z.infer<typeof PaginatedUsersSchema>;

export const AdminStatsSchema = z.object({
  totalUsers: z.number().int().min(0),
  activeUsers: z.number().int().min(0),
  totalResumes: z.number().int().min(0),
  publicProfiles: z.number().int().min(0),
  newUsersToday: z.number().int().min(0),
  newUsersThisWeek: z.number().int().min(0),
  newUsersThisMonth: z.number().int().min(0),
});

export type AdminStats = z.infer<typeof AdminStatsSchema>;

export const ActivityTypeSchema = z.enum([
  'USER_REGISTERED',
  'USER_LOGIN',
  'RESUME_CREATED',
  'PROFILE_UPDATED',
]);

export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const RecentActivitySchema = z.object({
  id: z.string(),
  type: ActivityTypeSchema,
  userId: z.string(),
  userName: z.string(),
  timestamp: z.string().datetime(),
  details: z.string().optional(),
});

export type RecentActivity = z.infer<typeof RecentActivitySchema>;

export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'down']);

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const SystemHealthSchema = z.object({
  database: HealthStatusSchema,
  api: HealthStatusSchema,
  storage: HealthStatusSchema,
  lastChecked: z.string().datetime(),
});

export type SystemHealth = z.infer<typeof SystemHealthSchema>;
