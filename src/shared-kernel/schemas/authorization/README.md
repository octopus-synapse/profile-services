# Authorization Schemas

RBAC (Role-Based Access Control) validation schemas for the Profile authorization system.

## Overview

This package provides Zod schemas and TypeScript types for managing permissions, roles, groups, and user authorization assignments.

## Core Concepts

- **Permission**: Fine-grained access control (resource + action)
- **Role**: Collection of permissions
- **Group**: Organization unit that can have roles and permissions
- **User Assignments**: Direct or inherited authorization

## Schemas

### Permission Schemas

- `CreatePermissionSchema` - Create new permissions
- `PermissionResponseSchema` - Permission data transfer
- `ListPermissionsQuerySchema` - Query/filter permissions

### Role Schemas

- `CreateRoleSchema` - Create roles
- `UpdateRoleSchema` - Modify role metadata
- `RoleWithPermissionsResponseSchema` - Role with full permission list
- `AssignRolePermissionsSchema` - Assign permissions to roles

### Group Schemas

- `CreateGroupSchema` - Create organizational groups
- `UpdateGroupSchema` - Modify group metadata
- `GroupWithHierarchyResponseSchema` - Group with parent/child relationships
- `AssignGroupRolesSchema` - Assign roles to groups

### User Authorization Schemas

- `AssignUserRolesSchema` - Assign roles to users
- `AssignUserGroupsSchema` - Add users to groups
- `GrantUserPermissionsSchema` - Direct permission grants
- `CheckPermissionResponseSchema` - Permission check results
- `UserAuthorizationSummarySchema` - Complete user authorization state

## Usage

```typescript
import {
 CreatePermissionSchema,
 CreateRoleSchema,
 AssignUserRolesSchema,
 type Permission,
 type Role,
} from "@octopus-synapse/profile-contracts";

// Validate permission creation
const permissionData = CreatePermissionSchema.parse({
 resource: "theme",
 action: "approve",
 description: "Approve theme submissions",
});

// Validate role assignment
const assignmentData = AssignUserRolesSchema.parse({
 userId: "user-123",
 roleIds: ["role-456", "role-789"],
});
```

## Standard Resources and Actions

The schemas include predefined enums for common resources and actions:

**Resources**: `user`, `theme`, `resume`, `section`, `profile`, `chat`, `analytics`

**Actions**: `create`, `read`, `update`, `delete`, `manage`, `approve`, `publish`

## Design Principles

1. **Permission-based, not role-based**: Code checks permissions, not role names
2. **Dynamic roles**: Role names can be changed in the database without code changes
3. **Hierarchical groups**: Groups can inherit permissions through parent relationships
4. **Multiple assignment paths**: Users can receive permissions via direct assignment, roles, or groups
