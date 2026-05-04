import type { LoggerPort } from '../logger/logger.port';
import type { Lifecycle } from './lifecycle.port';

/**
 * Build a `Lifecycle` whose `init` runs `fn`, logs start/end with
 * timing, and propagates errors as-is so the boot sequence fails fast.
 *
 * Replaces the `Lifecycle[] = [{ init: async () => register…() }]`
 * boilerplate every BC composition is currently writing inline (Q35
 * in the duplication audit).
 */
export function initLifecycle(
  name: string,
  fn: () => Promise<void> | void,
  logger?: LoggerPort,
): Lifecycle {
  return {
    init: async () => {
      const startedAt = Date.now();
      logger?.debug(`[lifecycle:init] ${name} started`, 'initLifecycle');
      try {
        await fn();
        const elapsedMs = Date.now() - startedAt;
        logger?.debug(`[lifecycle:init] ${name} done in ${elapsedMs}ms`, 'initLifecycle');
      } catch (err) {
        const elapsedMs = Date.now() - startedAt;
        const message = err instanceof Error ? err.message : 'unknown error';
        logger?.error(`[lifecycle:init] ${name} failed after ${elapsedMs}ms: ${message}`, {
          context: 'initLifecycle',
          stack: err instanceof Error ? err.stack : undefined,
        });
        throw err;
      }
    },
  };
}
