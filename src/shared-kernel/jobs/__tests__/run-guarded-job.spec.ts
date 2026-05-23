import { beforeEach, describe, expect, it } from 'bun:test';
import {
  type AcquireLockOptions,
  type DistributedLockHandle,
  DistributedLockPort,
} from '@/shared-kernel/concurrency/distributed-lock.port';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { runGuardedJob } from '../run-guarded-job';

class FakeLock extends DistributedLockPort {
  public attempts: Array<{ key: string; ttlMs: number }> = [];
  public holding = new Set<string>();
  public grantNext: 'ok' | 'busy' = 'ok';

  async acquire(key: string, options: AcquireLockOptions): Promise<DistributedLockHandle | null> {
    this.attempts.push({ key, ttlMs: options.ttlMs });
    if (this.grantNext === 'busy') return null;
    if (this.holding.has(key)) return null;
    this.holding.add(key);
    return {
      token: 't',
      release: async () => {
        this.holding.delete(key);
      },
    };
  }
}

describe('runGuardedJob (P0-010)', () => {
  let lock: FakeLock;

  beforeEach(() => {
    lock = new FakeLock();
  });

  it('runs the body when the lock is granted', async () => {
    let ran = 0;
    await runGuardedJob(
      {
        name: 'TestWorker',
        expectedDurationMs: 1_000,
        failureMode: 'LOG_AND_CONTINUE',
        lock,
        logger: stubLogger,
      },
      async () => {
        ran++;
      },
    );
    expect(ran).toBe(1);
  });

  it('uses TTL = max(2 × expected, 5min)', async () => {
    await runGuardedJob(
      {
        name: 'TestWorker',
        expectedDurationMs: 1_000, // 1s — 2× = 2s, floored to 5min
        failureMode: 'LOG_AND_CONTINUE',
        lock,
        logger: stubLogger,
      },
      async () => {},
    );
    expect(lock.attempts[0]?.ttlMs).toBe(5 * 60_000);
  });

  it('uses TTL = 2 × expected when expected is large', async () => {
    await runGuardedJob(
      {
        name: 'LongWorker',
        expectedDurationMs: 10 * 60_000, // 10min
        failureMode: 'LOG_AND_CONTINUE',
        lock,
        logger: stubLogger,
      },
      async () => {},
    );
    expect(lock.attempts[0]?.ttlMs).toBe(20 * 60_000);
  });

  it('skips silently when the lock is held by another instance', async () => {
    lock.grantNext = 'busy';
    let ran = 0;
    await runGuardedJob(
      {
        name: 'TestWorker',
        expectedDurationMs: 1_000,
        failureMode: 'LOG_AND_CONTINUE',
        lock,
        logger: stubLogger,
      },
      async () => {
        ran++;
      },
    );
    expect(ran).toBe(0); // body NOT executed — silent skip
  });

  it('swallows errors when failureMode is LOG_AND_CONTINUE', async () => {
    await expect(
      runGuardedJob(
        {
          name: 'TestWorker',
          expectedDurationMs: 1_000,
          failureMode: 'LOG_AND_CONTINUE',
          lock,
          logger: stubLogger,
        },
        async () => {
          throw new Error('boom');
        },
      ),
    ).resolves.toBeUndefined();
  });

  it('rethrows when failureMode is RETRY', async () => {
    await expect(
      runGuardedJob(
        {
          name: 'TestWorker',
          expectedDurationMs: 1_000,
          failureMode: 'RETRY',
          lock,
          logger: stubLogger,
        },
        async () => {
          throw new Error('boom');
        },
      ),
    ).rejects.toThrow('boom');
  });
});
