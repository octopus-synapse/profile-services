/**
 * Group Schemas
 *
 * Defines the structure for groups in the RBAC system.
 * Groups enable hierarchical organization of roles and permissions.
 */

import { z } from "zod";
import { RoleResponseSchema } from "./role.schema";
import { PermissionResponseSchema } from "./permission.schema";

// ============================================================================
// Group Schemas
// ============================================================================

/**
 * Schema for creating a new group.
 */
export const CreateGroupSchema = z.object({
 name: z
  .string()
  .min(1)
  .max(50)
  .regex(
   /^[a-z][a-z0-9_]*$/,
   "Group name must start with lowercase letter and contain only lowercase letters, numbers, and underscores"
  ),
 displayName: z.string().min(1).max(100),
 description: z.string().max(500).optional(),
 isSystem: z.boolean().default(false),
 parentId: z.string().cuid().optional().nullable(),
});

export type CreateGroup = z.infer<typeof CreateGroupSchema>;

/**
 * Schema for updating a group.
 */
export const UpdateGroupSchema = z.object({
 displayName: z.string().min(1).max(100).optional(),
 description: z.string().max(500).optional(),
 parentId: z.string().cuid().optional().nullable(),
});

export type UpdateGroup = z.infer<typeof UpdateGroupSchema>;

/**
 * Schema for group response (basic).
 */
export const GroupResponseSchema = z.object({
 id: z.string(),
 name: z.string(),
 displayName: z.string(),
 description: z.string().nullable(),
 isSystem: z.boolean(),
 parentId: z.string().nullable(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type GroupResponse = z.infer<typeof GroupResponseSchema>;

/**
 * Schema for group response with hierarchy.
 */
export const GroupWithHierarchyResponseSchema: z.ZodType<GroupWithHierarchyResponse> =
 z.lazy(() =>
  GroupResponseSchema.extend({
   parent: GroupResponseSchema.nullable().optional(),
   children: z.array(GroupWithHierarchyResponseSchema).optional(),
  })
 );

export interface GroupWithHierarchyResponse extends GroupResponse {
 parent?: GroupResponse | null;
 children?: GroupWithHierarchyResponse[];
}

/**
 * Schema for group response with roles and permissions.
 */
export const GroupWithAuthResponseSchema = GroupResponseSchema.extend({
 roles: z.array(RoleResponseSchema).optional(),
 permissions: z.array(PermissionResponseSchema).optional(),
});

export type GroupWithAuthResponse = z.infer<typeof GroupWithAuthResponseSchema>;

/**
 * Schema for assigning roles to a group.
 */
export const AssignGroupRolesSchema = z.object({
 roleIds: z.array(z.string().cuid()).min(1),
});

export type AssignGroupRoles = z.infer<typeof AssignGroupRolesSchema>;

/**
 * Schema for removing roles from a group.
 */
export const RemoveGroupRolesSchema = z.object({
 roleIds: z.array(z.string().cuid()).min(1),
});

export type RemoveGroupRoles = z.infer<typeof RemoveGroupRolesSchema>;

/**
 * Schema for listing groups with filters.
 */
export const ListGroupsQuerySchema = z.object({
 name: z.string().optional(),
 parentId: z.string().cuid().optional().nullable(),
 isSystem: z.coerce.boolean().optional(),
 includeHierarchy: z.coerce.boolean().default(false),
 page: z.coerce.number().min(1).default(1),
 limit: z.coerce.number().min(1).max(100).default(20),
});

export type ListGroupsQuery = z.infer<typeof ListGroupsQuerySchema>;
