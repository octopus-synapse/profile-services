/**
 * In-process implementation of `DistributedLockPort`. Sufficient for
 * single-instance dev and unit tests. Production multi-instance deploys
 * MUST swap this for a Redis-backed adapter (SETNX with NX/EX) so the
 * lock is honored across pods — that's the whole point of the port.
 *
 * The TTL is enforced by the adapter: callers can hold a lock past
 * `ttlMs` only if no one else attempts to acquire it; on the next
 * acquire after expiry the entry is reaped.
 */

import { randomUUID } from 'node:crypto';
import {
  type AcquireLockOptions,
  type DistributedLockHandle,
  DistributedLockPort,
} from '@/shared-kernel/concurrency/distributed-lock.port';

interface LockEntry {
  readonly token: string;
  readonly expiresAt: number;
}

export class InMemoryDistributedLockAdapter extends DistributedLockPort {
  private readonly entries = new Map<string, LockEntry>();

  async acquire(key: string, options: AcquireLockOptions): Promise<DistributedLockHandle | null> {
    const maxRetries = options.maxRetries ?? 0;
    const retryEveryMs = options.retryEveryMs ?? 50;
    let attempts = 0;
    while (true) {
      const handle = this.tryAcquire(key, options.ttlMs);
      if (handle) return handle;
      if (attempts >= maxRetries) return null;
      attempts += 1;
      await new Promise((r) => setTimeout(r, retryEveryMs));
    }
  }

  private tryAcquire(key: string, ttlMs: number): DistributedLockHandle | null {
    const now = Date.now();
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > now) return null;
    const token = randomUUID();
    this.entries.set(key, { token, expiresAt: now + ttlMs });
    return {
      token,
      release: async () => {
        const cur = this.entries.get(key);
        // Only release if we still own it (token match) — TTL might
        // have flipped ownership to another acquirer.
        if (cur && cur.token === token) this.entries.delete(key);
      },
    };
  }
}
