import type { Role, RoleId } from '../domain/entities/role.entity';
import type { IRoleRepository } from '../domain/ports';

export class InMemoryRoleRepository implements IRoleRepository {
  private roles = new Map<RoleId, Role>();
  private nameIndex = new Map<string, RoleId>(); // name -> id

  async findById(id: RoleId): Promise<Role | null> {
    return this.roles.get(id) ?? null;
  }

  async findByIds(ids: RoleId[]): Promise<Role[]> {
    return ids.map((id) => this.roles.get(id)).filter(Boolean) as Role[];
  }

  async findByName(name: string): Promise<Role | null> {
    const id = this.nameIndex.get(name.toLowerCase());
    if (!id) return null;
    return this.roles.get(id) ?? null;
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  seed(role: Role): void {
    this.roles.set(role.id, role);
    this.nameIndex.set(role.name.toLowerCase(), role.id);
  }

  seedMany(roles: Role[]): void {
    for (const r of roles) {
      this.seed(r);
    }
  }

  getAll(): Role[] {
    return Array.from(this.roles.values());
  }

  clear(): void {
    this.roles.clear();
    this.nameIndex.clear();
  }
}
