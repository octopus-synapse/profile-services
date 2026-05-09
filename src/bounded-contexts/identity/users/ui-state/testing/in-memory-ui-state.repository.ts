import {
  type UiStateEntry,
  UiStateRepositoryPort,
} from '../application/ports/ui-state-repository.port';

export class InMemoryUiStateRepository extends UiStateRepositoryPort {
  private readonly byUser = new Map<string, Map<string, unknown>>();

  async list(userId: string): Promise<UiStateEntry[]> {
    const entries = this.byUser.get(userId);
    if (!entries) return [];
    return Array.from(entries.entries()).map(([key, value]) => ({ key, value }));
  }

  async find(userId: string, key: string): Promise<UiStateEntry | null> {
    const entries = this.byUser.get(userId);
    if (!entries?.has(key)) return null;
    return { key, value: entries.get(key) };
  }

  async upsert(userId: string, entry: UiStateEntry): Promise<UiStateEntry> {
    let bucket = this.byUser.get(userId);
    if (!bucket) {
      bucket = new Map();
      this.byUser.set(userId, bucket);
    }
    bucket.set(entry.key, entry.value);
    return entry;
  }

  async delete(userId: string, key: string): Promise<void> {
    this.byUser.get(userId)?.delete(key);
  }
}
