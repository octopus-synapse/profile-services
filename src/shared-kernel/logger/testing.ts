/**
 * Test helpers for `LoggerPort`.
 *
 * Re-export an empty noop logger that satisfies the port shape — every
 * spec that doesn't care about log output should use this instead of
 * inlining its own `{ log: () => {}, ... }` literal. Kept under
 * `shared-kernel/logger/` so consumers can import from
 * `@/shared-kernel/logger/testing` without pulling other testing utils.
 */

import type { LoggerPort } from './logger.port';

export const stubLogger: LoggerPort = {
  log: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
};

/** When a test wants to assert what was logged, swap `stubLogger` for
 * `createMemoryLogger()` and inspect the `entries` array afterwards. */
export interface MemoryLogger extends LoggerPort {
  entries: ReadonlyArray<{
    level: 'log' | 'debug' | 'warn' | 'error';
    message: string;
    context?: string;
    trace?: unknown;
    meta?: Record<string, unknown>;
  }>;
}

export function createMemoryLogger(): MemoryLogger {
  const entries: MemoryLogger['entries'] = [];
  const push = (entry: MemoryLogger['entries'][number]) =>
    (entries as MemoryLogger['entries'][number][]).push(entry);
  return {
    entries,
    log: (message, context, meta) => push({ level: 'log', message, context, meta }),
    debug: (message, context, meta) => push({ level: 'debug', message, context, meta }),
    warn: (message, context, meta) => push({ level: 'warn', message, context, meta }),
    error: (message, trace, context, meta) =>
      push({ level: 'error', message, trace, context, meta }),
  };
}
