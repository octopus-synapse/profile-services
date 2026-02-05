/**
 * Role Schemas
 *
 * Defines the structure for roles in the RBAC system.
 * Roles are named collections of permissions.
 */

import { z } from "zod";
import {
 PermissionResponseSchema,
 PermissionIdentifierSchema,
} from "./permission.schema";

// ============================================================================
// Role Schemas
// ============================================================================

/**
 * Schema for creating a new role.
 */
export const CreateRoleSchema = z.object({
 name: z
  .string()
  .min(1)
  .max(50)
  .regex(
   /^[a-z][a-z0-9_]*$/,
   "Role name must start with lowercase letter and contain only lowercase letters, numbers, and underscores"
  ),
 displayName: z.string().min(1).max(100),
 description: z.string().max(500).optional(),
 isSystem: z.boolean().default(false),
 priority: z.number().int().min(0).max(1000).default(0),
 permissions: z.array(PermissionIdentifierSchema).optional(),
});

export type CreateRole = z.infer<typeof CreateRoleSchema>;

/**
 * Schema for updating a role.
 */
export const UpdateRoleSchema = z.object({
 displayName: z.string().min(1).max(100).optional(),
 description: z.string().max(500).optional(),
 priority: z.number().int().min(0).max(1000).optional(),
});

export type UpdateRole = z.infer<typeof UpdateRoleSchema>;

/**
 * Schema for role response (without permissions).
 */
export const RoleResponseSchema = z.object({
 id: z.string(),
 name: z.string(),
 displayName: z.string(),
 description: z.string().nullable(),
 isSystem: z.boolean(),
 priority: z.number(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type RoleResponse = z.infer<typeof RoleResponseSchema>;

/**
 * Schema for role response with permissions.
 */
export const RoleWithPermissionsResponseSchema = RoleResponseSchema.extend({
 permissions: z.array(PermissionResponseSchema),
});

export type RoleWithPermissionsResponse = z.infer<
 typeof RoleWithPermissionsResponseSchema
>;

/**
 * Schema for assigning permissions to a role.
 */
export const AssignRolePermissionsSchema = z.object({
 permissions: z.array(PermissionIdentifierSchema).min(1),
});

export type AssignRolePermissions = z.infer<typeof AssignRolePermissionsSchema>;

/**
 * Schema for removing permissions from a role.
 */
export const RemoveRolePermissionsSchema = z.object({
 permissions: z.array(PermissionIdentifierSchema).min(1),
});

export type RemoveRolePermissions = z.infer<typeof RemoveRolePermissionsSchema>;

/**
 * Schema for listing roles with filters.
 */
export const ListRolesQuerySchema = z.object({
 name: z.string().optional(),
 isSystem: z.coerce.boolean().optional(),
 page: z.coerce.number().min(1).default(1),
 limit: z.coerce.number().min(1).max(100).default(20),
});

export type ListRolesQuery = z.infer<typeof ListRolesQuerySchema>;
