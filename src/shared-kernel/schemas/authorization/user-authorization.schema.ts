/**
 * User Authorization Schemas
 *
 * Defines the structure for user-level authorization assignments.
 * Covers role assignments, group memberships, and direct permissions.
 */

import { z } from "zod";
import {
 PermissionResponseSchema,
 PermissionIdentifierSchema,
} from "./permission.schema";
import { RoleResponseSchema } from "./role.schema";
import { GroupResponseSchema } from "./group.schema";

// ============================================================================
// User Role Assignment Schemas
// ============================================================================

/**
 * Schema for assigning roles to a user.
 */
export const AssignUserRolesSchema = z.object({
 roleIds: z.array(z.string().cuid()).min(1),
 expiresAt: z.coerce.date().optional(),
});

export type AssignUserRoles = z.infer<typeof AssignUserRolesSchema>;

/**
 * Schema for removing roles from a user.
 */
export const RemoveUserRolesSchema = z.object({
 roleIds: z.array(z.string().cuid()).min(1),
});

export type RemoveUserRoles = z.infer<typeof RemoveUserRolesSchema>;

/**
 * Schema for user role assignment response.
 */
export const UserRoleAssignmentResponseSchema = z.object({
 id: z.string(),
 userId: z.string(),
 roleId: z.string(),
 role: RoleResponseSchema,
 assignedBy: z.string().nullable(),
 assignedAt: z.coerce.date(),
 expiresAt: z.coerce.date().nullable(),
});

export type UserRoleAssignmentResponse = z.infer<
 typeof UserRoleAssignmentResponseSchema
>;

// ============================================================================
// User Group Membership Schemas
// ============================================================================

/**
 * Schema for adding user to groups.
 */
export const AssignUserGroupsSchema = z.object({
 groupIds: z.array(z.string().cuid()).min(1),
 expiresAt: z.coerce.date().optional(),
});

export type AssignUserGroups = z.infer<typeof AssignUserGroupsSchema>;

/**
 * Schema for removing user from groups.
 */
export const RemoveUserGroupsSchema = z.object({
 groupIds: z.array(z.string().cuid()).min(1),
});

export type RemoveUserGroups = z.infer<typeof RemoveUserGroupsSchema>;

/**
 * Schema for user group membership response.
 */
export const UserGroupMembershipResponseSchema = z.object({
 id: z.string(),
 userId: z.string(),
 groupId: z.string(),
 group: GroupResponseSchema,
 assignedBy: z.string().nullable(),
 assignedAt: z.coerce.date(),
 expiresAt: z.coerce.date().nullable(),
});

export type UserGroupMembershipResponse = z.infer<
 typeof UserGroupMembershipResponseSchema
>;

// ============================================================================
// User Direct Permission Schemas
// ============================================================================

/**
 * Schema for granting direct permissions to a user.
 */
export const GrantUserPermissionsSchema = z.object({
 permissions: z.array(PermissionIdentifierSchema).min(1),
 reason: z.string().max(500).optional(),
 expiresAt: z.coerce.date().optional(),
});

export type GrantUserPermissions = z.infer<typeof GrantUserPermissionsSchema>;

/**
 * Schema for denying permissions from a user.
 */
export const DenyUserPermissionsSchema = z.object({
 permissions: z.array(PermissionIdentifierSchema).min(1),
 reason: z.string().max(500).optional(),
 expiresAt: z.coerce.date().optional(),
});

export type DenyUserPermissions = z.infer<typeof DenyUserPermissionsSchema>;

/**
 * Schema for removing direct permissions from a user.
 */
export const RemoveUserPermissionsSchema = z.object({
 permissions: z.array(PermissionIdentifierSchema).min(1),
});

export type RemoveUserPermissions = z.infer<typeof RemoveUserPermissionsSchema>;

/**
 * Schema for user direct permission response.
 */
export const UserPermissionResponseSchema = z.object({
 id: z.string(),
 userId: z.string(),
 permissionId: z.string(),
 permission: PermissionResponseSchema,
 granted: z.boolean(),
 assignedBy: z.string().nullable(),
 assignedAt: z.coerce.date(),
 expiresAt: z.coerce.date().nullable(),
 reason: z.string().nullable(),
});

export type UserPermissionResponse = z.infer<
 typeof UserPermissionResponseSchema
>;

// ============================================================================
// User Authorization Summary
// ============================================================================

/**
 * Schema for checking if user has permission.
 */
export const CheckPermissionQuerySchema = z.object({
 resource: z.string().min(1),
 action: z.string().min(1),
});

export type CheckPermissionQuery = z.infer<typeof CheckPermissionQuerySchema>;

/**
 * Schema for check permission response.
 */
export const CheckPermissionResponseSchema = z.object({
 hasPermission: z.boolean(),
 source: z
  .enum(["direct_grant", "direct_deny", "role", "group", "inherited"])
  .optional(),
 permission: z.string().optional(),
});

export type CheckPermissionResponse = z.infer<
 typeof CheckPermissionResponseSchema
>;

/**
 * Schema for resolved permission with source information.
 */
export const ResolvedPermissionSchema = z.object({
 permission: z.string(),
 resource: z.string(),
 action: z.string(),
 granted: z.boolean(),
 source: z.enum(["direct_grant", "direct_deny", "role", "group", "inherited"]),
 sourceId: z.string().optional(),
 sourceName: z.string().optional(),
});

export type ResolvedPermission = z.infer<typeof ResolvedPermissionSchema>;

/**
 * Schema for user authorization summary response.
 */
export const UserAuthorizationSummarySchema = z.object({
 userId: z.string(),
 roles: z.array(UserRoleAssignmentResponseSchema),
 groups: z.array(UserGroupMembershipResponseSchema),
 directPermissions: z.array(UserPermissionResponseSchema),
 effectivePermissions: z.array(ResolvedPermissionSchema),
});

export type UserAuthorizationSummary = z.infer<
 typeof UserAuthorizationSummarySchema
>;

/**
 * Schema for listing user authorization with filters.
 */
export const ListUserAuthorizationQuerySchema = z.object({
 includeRoles: z.coerce.boolean().default(true),
 includeGroups: z.coerce.boolean().default(true),
 includeDirectPermissions: z.coerce.boolean().default(true),
 includeEffectivePermissions: z.coerce.boolean().default(false),
});

export type ListUserAuthorizationQuery = z.infer<
 typeof ListUserAuthorizationQuerySchema
>;
