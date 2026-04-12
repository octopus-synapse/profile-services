import type { Permission, PermissionId } from '../domain/entities/permission.entity';
import type { IPermissionRepository } from '../domain/ports';

export class InMemoryPermissionRepository implements IPermissionRepository {
  private permissions = new Map<PermissionId, Permission>();
  private keyIndex = new Map<string, PermissionId>(); // "resource:action" -> id

  async findById(id: PermissionId): Promise<Permission | null> {
    return this.permissions.get(id) ?? null;
  }

  async findByIds(ids: PermissionId[]): Promise<Permission[]> {
    return ids.map((id) => this.permissions.get(id)).filter(Boolean) as Permission[];
  }

  async findByKey(resource: string, action: string): Promise<Permission | null> {
    const key = `${resource.toLowerCase()}:${action.toLowerCase()}`;
    const id = this.keyIndex.get(key);
    if (!id) return null;
    return this.permissions.get(id) ?? null;
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  seed(permission: Permission): void {
    this.permissions.set(permission.id, permission);
    this.keyIndex.set(`${permission.resource}:${permission.action}`, permission.id);
  }

  seedMany(permissions: Permission[]): void {
    for (const p of permissions) {
      this.seed(p);
    }
  }

  getAll(): Permission[] {
    return Array.from(this.permissions.values());
  }

  clear(): void {
    this.permissions.clear();
    this.keyIndex.clear();
  }
}
