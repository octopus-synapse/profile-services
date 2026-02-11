/**
 * Permission Collector
 *
 * Aggregates permissions from multiple sources (direct, role, group)
 * and resolves them according to priority rules.
 *
 * Priority: Direct denials > Direct grants > Role > Group > Inherited
 */

import type { GroupId } from '../entities/group.entity';
import type { Permission, PermissionId } from '../entities/permission.entity';
import type { RoleId } from '../entities/role.entity';
import type { PermissionSource, ResolvedPermission } from '../entities/user-auth-context.entity';

interface PermissionEntry {
  sources: PermissionSource[];
  granted: boolean;
  hasDenial: boolean;
}

export class PermissionCollector {
  private entries = new Map<PermissionId, PermissionEntry>();

  addDirect(permissionId: PermissionId, granted: boolean, userId: string): void {
    const entry = this.getOrCreate(permissionId);
    entry.sources.push({
      type: 'direct',
      sourceId: userId,
      sourceName: 'Direct Assignment',
      inherited: false,
    });
    if (!granted) {
      entry.hasDenial = true;
      entry.granted = false;
    } else if (!entry.hasDenial) {
      entry.granted = true;
    }
  }

  addFromRole(permissionId: PermissionId, roleId: RoleId, roleName: string): void {
    const entry = this.getOrCreate(permissionId);
    entry.sources.push({
      type: 'role',
      sourceId: roleId,
      sourceName: roleName,
      inherited: false,
    });
    if (!entry.hasDenial) {
      entry.granted = true;
    }
  }

  addFromGroup(
    permissionId: PermissionId,
    groupId: GroupId,
    groupName: string,
    inherited: boolean,
  ): void {
    const entry = this.getOrCreate(permissionId);
    entry.sources.push({
      type: 'group',
      sourceId: groupId,
      sourceName: groupName,
      inherited,
    });
    if (!entry.hasDenial) {
      entry.granted = true;
    }
  }

  getAllPermissionIds(): PermissionId[] {
    return Array.from(this.entries.keys());
  }

  resolve(permissionMap: Map<PermissionId, Permission>): ResolvedPermission[] {
    const resolved: ResolvedPermission[] = [];
    for (const [permissionId, entry] of this.entries) {
      const permission = permissionMap.get(permissionId);
      if (permission) {
        resolved.push({
          permission,
          sources: entry.sources,
          granted: entry.granted,
        });
      }
    }
    return resolved;
  }

  private getOrCreate(permissionId: PermissionId): PermissionEntry {
    let entry = this.entries.get(permissionId);
    if (!entry) {
      entry = { sources: [], granted: false, hasDenial: false };
      this.entries.set(permissionId, entry);
    }
    return entry;
  }
}
