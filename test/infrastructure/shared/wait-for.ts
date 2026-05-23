/**
 * Polling helper for tests that need to await side effects of async
 * event handlers (the bus runs handlers off the request thread, so
 * the route returns before the handler observable mutation lands).
 *
 * The legacy pattern was a flat `await new Promise(r => setTimeout(r, 500))`
 * which:
 *   - sleeps the full budget on every successful run (slow CI),
 *   - silently passes if the side effect never happens (false green).
 *
 * `waitFor(fn, opts)` polls `fn` until it returns truthy (or, when
 * `fn` returns nothing, until it stops throwing) and re-raises the
 * last assertion error on timeout. The default 500ms timeout matches
 * the historical sleep so CI baseline doesn't regress; bump per-call
 * when handlers are heavier (e.g. background SMTP).
 */

export interface WaitForOptions {
  /** Max wall-clock to wait. Defaults to 500ms (historical setTimeout value). */
  readonly timeout?: number;
  /** Poll interval. Defaults to 25ms. */
  readonly interval?: number;
  /** Optional descriptor surfaced in the failure message. */
  readonly label?: string;
}

export async function waitFor<T>(
  predicate: () => T | Promise<T>,
  opts: WaitForOptions = {},
): Promise<T> {
  const timeout = opts.timeout ?? 500;
  const interval = opts.interval ?? 25;
  const deadline = Date.now() + timeout;
  let lastError: unknown;

  while (Date.now() <= deadline) {
    try {
      const result = await predicate();
      if (result || result === undefined) return result as T;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, interval));
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error(`waitFor${opts.label ? ` (${opts.label})` : ''} timed out after ${timeout}ms`);
}
