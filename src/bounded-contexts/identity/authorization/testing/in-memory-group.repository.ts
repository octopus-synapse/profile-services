import type { Group, GroupId } from '../domain/entities/group.entity';
import type { IGroupRepository } from '../domain/ports';

export class InMemoryGroupRepository implements IGroupRepository {
  private groups = new Map<GroupId, Group>();
  private nameIndex = new Map<string, GroupId>(); // name -> id

  async findById(id: GroupId): Promise<Group | null> {
    return this.groups.get(id) ?? null;
  }

  async findByIds(ids: GroupId[]): Promise<Group[]> {
    return ids.map((id) => this.groups.get(id)).filter(Boolean) as Group[];
  }

  async findByName(name: string): Promise<Group | null> {
    const id = this.nameIndex.get(name.toLowerCase());
    if (!id) return null;
    return this.groups.get(id) ?? null;
  }

  async findAncestors(groupId: GroupId): Promise<Group[]> {
    const ancestors: Group[] = [];
    const visited = new Set<GroupId>();
    let currentId: GroupId | undefined = groupId;

    while (currentId) {
      if (visited.has(currentId)) break; // cycle protection
      visited.add(currentId);

      const group = this.groups.get(currentId);
      if (!group) break;

      if (currentId !== groupId) {
        ancestors.push(group);
      }

      currentId = group.parentId ?? undefined;
    }

    return ancestors;
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  seed(group: Group): void {
    this.groups.set(group.id, group);
    this.nameIndex.set(group.name.toLowerCase(), group.id);
  }

  seedMany(groups: Group[]): void {
    for (const g of groups) {
      this.seed(g);
    }
  }

  getAll(): Group[] {
    return Array.from(this.groups.values());
  }

  clear(): void {
    this.groups.clear();
    this.nameIndex.clear();
  }
}
