/**
 * Authorization Seed Runner
 *
 * Seeds the database with default permissions, roles, and groups.
 * Safe to run multiple times (upsert logic).
 */

import { PrismaClient } from '@prisma/client';
import { SYSTEM_PERMISSIONS } from './permissions';
import { SYSTEM_ROLES } from './system-roles';
import { SYSTEM_GROUPS } from './system-groups';

const prisma = new PrismaClient();

async function seedPermissions(): Promise<Map<string, string>> {
  console.log('🔐 Seeding permissions...');
  const permissionMap = new Map<string, string>();

  for (const permission of SYSTEM_PERMISSIONS) {
    const key = `${permission.resource}:${permission.action}`;

    const result = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: permission.resource,
          action: permission.action,
        },
      },
      create: {
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
        isSystem: permission.isSystem ?? false,
      },
      update: {
        description: permission.description,
        isSystem: permission.isSystem ?? false,
      },
    });

    permissionMap.set(key, result.id);
    console.log(`  ✓ ${key}`);
  }

  console.log(`  Created/updated ${permissionMap.size} permissions\n`);
  return permissionMap;
}

async function seedRoles(
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

    // Assign permissions to role
    for (const permKey of roleDef.permissions) {
      const permissionId = permissionMap.get(permKey);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId,
            },
          },
          create: {
            roleId: role.id,
            permissionId,
          },
          update: {},
        });
      } else {
        console.warn(
          `  ⚠ Permission "${permKey}" not found for role "${roleDef.name}"`,
        );
      }
    }

    console.log(
      `  ✓ ${roleDef.name} (${roleDef.permissions.length} permissions)`,
    );
  }

  console.log(`  Created/updated ${roleMap.size} roles\n`);
  return roleMap;
}

async function seedGroups(
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
            groupId_roleId: {
              groupId: group.id,
              roleId,
            },
          },
          create: {
            groupId: group.id,
            roleId,
          },
          update: {},
        });
      } else {
        console.warn(
          `  ⚠ Role "${roleName}" not found for group "${groupDef.name}"`,
        );
      }
    }

    // Assign direct permissions to group
    if (groupDef.permissions) {
      for (const permKey of groupDef.permissions) {
        const permissionId = permissionMap.get(permKey);
        if (permissionId) {
          await prisma.groupPermission.upsert({
            where: {
              groupId_permissionId: {
                groupId: group.id,
                permissionId,
              },
            },
            create: {
              groupId: group.id,
              permissionId,
            },
            update: {},
          });
        }
      }
    }

    console.log(`  ✓ ${groupDef.name} (${groupDef.roles.length} roles)`);
  }

  console.log(`  Created/updated ${SYSTEM_GROUPS.length} groups\n`);
}

export async function seedAuthorization(): Promise<void> {
  console.log('\n🚀 Starting authorization seed...\n');

  try {
    const permissionMap = await seedPermissions();
    const roleMap = await seedRoles(permissionMap);
    await seedGroups(roleMap, permissionMap);

    console.log('✅ Authorization seed completed successfully!\n');
  } catch (error) {
    console.error('❌ Authorization seed failed:', error);
    throw error;
  }
}

// Run directly if called as script
if (require.main === module) {
  void seedAuthorization()
    .then(() => prisma.$disconnect())
    .catch((error) => {
      console.error(error);
      void prisma.$disconnect();
      process.exit(1);
    });
}
