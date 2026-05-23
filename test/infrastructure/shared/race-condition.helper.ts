/**
 * Race-condition test helper. Runs `fn(i)` `n` times in parallel and
 * splits fulfilled vs rejected outcomes so suites can assert on
 * concurrent behaviour (rate-limit caps, optimistic-lock contention,
 * idempotent-create dedup, etc.).
 *
 * Why `Promise.allSettled`: a single rejection from `Promise.all`
 * would discard the fulfilled outcomes — exactly the partial-success
 * data we need to assert on. `allSettled` preserves both halves.
 */

export interface ParallelOutcome<T> {
  /** Values from fulfilled promises. */
  readonly successes: T[];
  /** Rejection reasons. Order matches the original `0..n` indices the
   *  failures came from but skips fulfilled slots — for index-aligned
   *  inspection use `Promise.allSettled` directly. */
  readonly failures: unknown[];
}

/** Run `fn(i)` for `i` in `[0, n)` in parallel and return successes /
 *  failures sliced apart. */
export async function runInParallel<T>(
  n: number,
  fn: (i: number) => Promise<T>,
): Promise<ParallelOutcome<T>> {
  if (n < 0) throw new RangeError(`runInParallel: n must be >= 0, got ${n}`);
  const settled = await Promise.allSettled(Array.from({ length: n }, (_, i) => fn(i)));
  const successes: T[] = [];
  const failures: unknown[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      successes.push(result.value);
    } else {
      failures.push(result.reason);
    }
  }
  return { successes, failures };
}
