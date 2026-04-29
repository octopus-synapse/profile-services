/**
 * Authorization Seed Runner
 *
 * Seeds the database with default permissions, roles, and groups.
 * Safe to run multiple times (upsert logic).
 */

import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '@/bounded-contexts/platform/prisma/prisma-client-options';
import { Permission } from '@/shared-kernel/authorization/permission.enum';
import type { CreatePermissionInput } from '../domain/entities/permission.entity';
import { SYSTEM_PERMISSIONS as LEGACY_PERMISSIONS } from './permissions';
import { SYSTEM_GROUPS } from './system-groups';
import { SYSTEM_ROLES } from './system-roles';

let cliPrisma: PrismaClient | null = null;

// Source of truth: the Permission enum. Every value `resource:action` is
// mirrored as a Permission row. Legacy SYSTEM_PERMISSIONS adds a few
// extra metadata-rich entries (descriptions) for the same keys.
function buildPermissionList(): CreatePermissionInput[] {
  const seen = new Set<string>();
  const result: CreatePermissionInput[] = [];

  // Legacy descriptive entries first (preserve description + isSystem)
  for (const p of LEGACY_PERMISSIONS) {
    const key = `${p.resource}:${p.action}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }

  // Fill any enum entry the legacy list missed
  for (const value of Object.values(Permission)) {
    const [resource, action] = String(value).split(':') as [string, string];
    if (!resource || !action) continue;
    const key = `${resource}:${action}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ resource, action, description: `${resource} ${action}`, isSystem: true });
  }

  return result;
}

async function seedPermissions(prisma: PrismaClient): Promise<Map<string, string>> {
  console.log('🔐 Seeding permissions...');
  const permissionMap = new Map<string, string>();
  const allPermissions = buildPermissionList();

  for (const permission of allPermissions) {
    const key = `${permission.resource}:${permission.action}`;

    const result = await prisma.permission.upsert({
      where: {
        resource_action: { resource: permission.resource, action: permission.action },
      },
      create: {
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
        isSystem: permission.isSystem ?? false,
      },
      update: { description: permission.description, isSystem: permission.isSystem ?? false },
    });

    permissionMap.set(key, result.id);
  }

  console.log(`  Created/updated ${permissionMap.size} permissions\n`);
  return permissionMap;
}

async function seedRoles(
  prisma: PrismaClient,
  permissionMap: Map<string, string>,
): Promise<Map<string, string>> {
  console.log('👤 Seeding roles...');
  const roleMap = new Map<string, string>();

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      create: {
        name: roleDef.name,
        displayName: roleDef.displayName,
        description: roleDef.description,
        isSystem: roleDef.isSystem ?? false,
        priority: roleDef.priority ?? 0,
      },
      update: {
        displayName: roleDef.displayName,
        description: roleDef.description,
        isSystem: roleDef.isSystem ?? false,
        priority: roleDef.priority ?? 0,
      },
    });

    roleMap.set(roleDef.name, role.id);

    // Per product decision: the `admin` role receives every permission
    // declared in the Permission enum (auto-grant). Other roles use their
    // explicit list.
    const grants =
      roleDef.name === 'admin' ? Array.from(permissionMap.keys()) : roleDef.permissions;

    for (const permKey of grants) {
      const permissionId = permissionMap.get(permKey);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId },
          },
          create: { roleId: role.id, permissionId },
          update: {},
        });
      } else {
        console.warn(`  ⚠ Permission "${permKey}" not found for role "${roleDef.name}"`);
      }
    }

    console.log(`  ✓ ${roleDef.name} (${grants.length} permissions)`);
  }

  console.log(`  Created/updated ${roleMap.size} roles\n`);
  return roleMap;
}

async function seedGroups(
  prisma: PrismaClient,
  roleMap: Map<string, string>,
  permissionMap: Map<string, string>,
): Promise<void> {
  console.log('👥 Seeding groups...');

  for (const groupDef of SYSTEM_GROUPS) {
    const group = await prisma.group.upsert({
      where: { name: groupDef.name },
      create: {
        name: groupDef.name,
        displayName: groupDef.displayName,
        description: groupDef.description,
        isSystem: groupDef.isSystem ?? false,
        parentId: groupDef.parentId,
      },
      update: {
        displayName: groupDef.displayName,
        description: groupDef.description,
        isSystem: groupDef.isSystem ?? false,
      },
    });

    // Assign roles to group
    for (const roleName of groupDef.roles) {
      const roleId = roleMap.get(roleName);
      if (roleId) {
        await prisma.groupRole.upsert({
          where: {
            groupId_roleId: { groupId: group.id, roleId },
          },
          create: { groupId: group.id, roleId },
          update: {},
        });
      } else {
        console.warn(`  ⚠ Role "${roleName}" not found for group "${groupDef.name}"`);
      }
    }

    // Assign direct permissions to group
    if (groupDef.permissions) {
      for (const permKey of groupDef.permissions) {
        const permissionId = permissionMap.get(permKey);
        if (permissionId) {
          await prisma.groupPermission.upsert({
            where: {
              groupId_permissionId: { groupId: group.id, permissionId },
            },
            create: { groupId: group.id, permissionId },
            update: {},
          });
        }
      }
    }

    console.log(`  ✓ ${groupDef.name} (${groupDef.roles.length} roles)`);
  }

  console.log(`  Created/updated ${SYSTEM_GROUPS.length} groups\n`);
}

export async function seedAuthorization(prismaArg?: PrismaClient): Promise<void> {
  const prisma = prismaArg ?? (cliPrisma ??= new PrismaClient(createPrismaClientOptions()));
  console.log('\n🚀 Starting authorization seed...\n');

  try {
    const permissionMap = await seedPermissions(prisma);
    const roleMap = await seedRoles(prisma, permissionMap);
    await seedGroups(prisma, roleMap, permissionMap);

    console.log('✅ Authorization seed completed successfully!\n');
  } catch (error) {
    console.error('❌ Authorization seed failed:', error);
    throw error;
  }
}

// Run directly if called as script
if (require.main === module) {
  void seedAuthorization()
    .then(() => cliPrisma?.$disconnect())
    .catch((error) => {
      console.error(error);
      void cliPrisma?.$disconnect();
      process.exit(1);
    });
}
