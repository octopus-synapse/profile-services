/**
 * Pending-handler tracker — integration test helper.
 *
 * Async event handlers fire on `EventEmitter.emit`, return a Promise,
 * and the emitter discards it. If the test moves to its `afterEach`
 * (which often deletes the user that the still-pending handler is
 * about to audit), the handler eventually fails with a FK violation
 * and the rejection lands on `process.on('unhandledRejection')`
 * AFTER the test boundary. Bun reports it as
 * `# Unhandled error between tests` and the next test inherits a
 * corrupted state.
 *
 * This module gives the bootstrap a way to *push* every in-flight
 * handler Promise into a shared registry, and gives the integration
 * test setup a `waitForPendingHandlers()` to await them all in
 * `afterEach`. The Promise itself is wrapped so a rejection is
 * swallowed (already handled by the upstream `.catch` on each
 * binding) — the tracker only cares about *settlement*, not result.
 *
 * Behaviour by environment:
 *   - production / dev (default): `track()` is a no-op (registry is
 *     never installed), zero overhead.
 *   - test (`NODE_ENV=test`): bootstrap calls `enableTracking()` and
 *     `track()` actually pushes. `waitForPendingHandlers()` blocks
 *     until the set drains.
 */

// lint-allow-mutable-module-state: tracker boolean flipped exactly once
// no boot por NODE_ENV=test; sem dono natural (helper de test scoping).
let trackingEnabled = false;
const pending = new Set<Promise<unknown>>();

export function enableTracking(): void {
  trackingEnabled = true;
}

export function disableTracking(): void {
  trackingEnabled = false;
  pending.clear();
}

export function track<T>(promise: Promise<T>): Promise<T> {
  if (!trackingEnabled) return promise;
  // Wrap in a sibling Promise that always resolves so a rejection
  // doesn't poison the registry (rejections are still observed by
  // the original `.catch` on the binding).
  const sentinel = promise.then(
    () => undefined,
    () => undefined,
  );
  pending.add(sentinel);
  sentinel.finally(() => pending.delete(sentinel));
  return promise;
}

export async function waitForPendingHandlers(timeoutMs = 2000): Promise<void> {
  if (pending.size === 0) return;
  const all = Array.from(pending);
  const deadline = new Promise<'timeout'>((resolve) =>
    setTimeout(() => resolve('timeout'), timeoutMs),
  );
  await Promise.race([Promise.all(all), deadline]);
}

export function pendingHandlerCount(): number {
  return pending.size;
}
