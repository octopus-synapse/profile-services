/**
 * In-memory `MecCachePort` for tests. Stores values in a `Map`; ignores
 * TTLs (every set is permanent for the lifetime of the test). Lock
 * semantics are emulated with a tiny boolean.
 */

import { MecCachePort } from '../domain/ports/mec-cache.port';

export class InMemoryMecCache extends MecCachePort {
  private readonly store = new Map<string, unknown>();
  private readonly locks = new Set<string>();

  snapshot<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T | undefined) ?? null;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const prefix = pattern.replace(/\*$/, '');
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  async acquireLock(key: string, _ttl: number): Promise<boolean> {
    if (this.locks.has(key)) return false;
    this.locks.add(key);
    return true;
  }

  async releaseLock(key: string): Promise<void> {
    this.locks.delete(key);
  }

  async isLocked(key: string): Promise<boolean> {
    return this.locks.has(key);
  }
}
