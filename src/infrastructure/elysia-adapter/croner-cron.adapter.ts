/**
 * `CronPort` impl backed by `croner`. Bun-native, zero deps, supports
 * the same cron syntax we use today (5 or 6 fields) plus IANA tz.
 *
 * Each registered handler creates a `Cron` instance that fires on the
 * scheduled tick. `dispose()` stops all cron jobs gracefully — wired
 * by the bootstrap on SIGTERM.
 *
 * P1 #43 — three correctness fixes on top of the original wrapper:
 *
 *   1. **Await + try/catch the handler.** The previous body did
 *      `void handler()`, which discarded the returned promise. A
 *      synchronous throw still surfaced via the fired-and-forgotten
 *      promise's `unhandledRejection`, but the cron tick had no
 *      record of which handler failed.
 *   2. **`protect: true`.** Croner's overlap protection — when a
 *      previous tick is still running, the next tick is skipped
 *      instead of stacking up. Without this a slow handler can
 *      pile up dozens of concurrent runs and starve the event loop.
 *   3. **Explicit timezone default.** `undefined` made Croner fall
 *      through to the host TZ which is non-deterministic across
 *      dev/prod boxes; pin to UTC when no tz is provided.
 */

import { Cron } from 'croner';
import { type CronHandler, CronPort, type CronSpec } from '@/shared-kernel/jobs/cron.port';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

const DEFAULT_TIMEZONE = 'UTC';

export class CronerCronAdapter extends CronPort implements Lifecycle {
  private readonly jobs: Cron[] = [];

  constructor(private readonly logger?: LoggerPort) {
    super();
  }

  register(spec: CronSpec, handler: CronHandler): void {
    const timezone = spec.tz ?? DEFAULT_TIMEZONE;
    const job = new Cron(spec.pattern, { timezone, protect: true }, async () => {
      try {
        await handler();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger?.error(`Cron handler failed (pattern=${spec.pattern}): ${message}`, {
          context: 'CronerCronAdapter',
          stack: err instanceof Error ? err.stack : undefined,
          pattern: spec.pattern,
          timezone,
        });
      }
    });
    this.jobs.push(job);
  }

  async dispose(): Promise<void> {
    for (const job of this.jobs) job.stop();
    this.jobs.length = 0;
  }
}
