/**
 * Permission Schemas
 *
 * Defines the structure for permission resources and actions.
 */

import { z } from "zod";

// ============================================================================
// Standard Resources and Actions
// ============================================================================

/**
 * Standard resource names in the system.
 * Resources represent entities that can be accessed.
 */
export const StandardResources = [
 "user",
 "resume",
 "theme",
 "skill",
 "education",
 "experience",
 "project",
 "certification",
 "language",
 "publication",
 "open-source",
 "volunteer",
 "award",
 "stats",
 "audit",
 "permission",
 "role",
 "group",
] as const;

export type StandardResource = (typeof StandardResources)[number];

/**
 * Standard action names in the system.
 * Actions represent operations that can be performed on resources.
 */
export const StandardActions = [
 "create",
 "read",
 "update",
 "delete",
 "manage", // Wildcard for all CRUD operations
 "approve",
 "reject",
 "publish",
 "archive",
 "export",
 "import",
 "share",
 "assign", // For role/permission assignment
] as const;

export type StandardAction = (typeof StandardActions)[number];

// ============================================================================
// Permission Schemas
// ============================================================================

/**
 * Schema for creating a new permission.
 */
export const CreatePermissionSchema = z.object({
 resource: z.string().min(1).max(50),
 action: z.string().min(1).max(50),
 description: z.string().max(255).optional(),
 isSystem: z.boolean().default(false),
});

export type CreatePermission = z.infer<typeof CreatePermissionSchema>;

/**
 * Schema for updating a permission.
 */
export const UpdatePermissionSchema = z.object({
 description: z.string().max(255).optional(),
});

export type UpdatePermission = z.infer<typeof UpdatePermissionSchema>;

/**
 * Schema for permission response.
 */
export const PermissionResponseSchema = z.object({
 id: z.string(),
 resource: z.string(),
 action: z.string(),
 description: z.string().nullable(),
 isSystem: z.boolean(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type PermissionResponse = z.infer<typeof PermissionResponseSchema>;

/**
 * Schema for permission identifier (resource:action format).
 */
export const PermissionIdentifierSchema = z
 .string()
 .regex(
  /^[a-z-]+:[a-z-]+$/,
  'Permission identifier must be in format "resource:action"'
 );

export type PermissionIdentifier = z.infer<typeof PermissionIdentifierSchema>;

/**
 * Schema for listing permissions with filters.
 */
export const ListPermissionsQuerySchema = z.object({
 resource: z.string().optional(),
 action: z.string().optional(),
 isSystem: z.coerce.boolean().optional(),
 page: z.coerce.number().min(1).default(1),
 limit: z.coerce.number().min(1).max(100).default(20),
});

export type ListPermissionsQuery = z.infer<typeof ListPermissionsQuerySchema>;
