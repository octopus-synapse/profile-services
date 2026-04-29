/**
 * Minimal `CacheLockService`-shaped adapter (acquireLock/releaseLock
 * surface) backed by an in-process map. Stand-in for the legacy
 * Redis-backed `CacheLockService` while the bootstrap doesn't surface
 * a real Redis lock service. Same contract:
 *   - acquireLock(key, ttlSec): true when acquired, false when held
 *   - releaseLock(key): drop regardless of holder
 *
 * Multi-instance correctness needs the real Redis impl; this is fine
 * for single-process dev + tests where the onboarding handler is the
 * only writer.
 */

interface LockEntry {
  expiresAt: number;
}

export class InMemoryCacheLockAdapter {
  private readonly locks = new Map<string, LockEntry>();

  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(key);
    if (existing && existing.expiresAt > now) return false;
    this.locks.set(key, { expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  async releaseLock(key: string): Promise<void> {
    this.locks.delete(key);
  }

  async isLocked(key: string): Promise<boolean> {
    const e = this.locks.get(key);
    if (!e) return false;
    if (e.expiresAt <= Date.now()) {
      this.locks.delete(key);
      return false;
    }
    return true;
  }
}
