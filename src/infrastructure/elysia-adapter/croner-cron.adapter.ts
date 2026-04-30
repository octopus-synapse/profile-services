/**
 * `CronPort` impl backed by `croner`. Bun-native, zero deps, supports
 * the same cron syntax we use today (5 or 6 fields) plus IANA tz.
 *
 * Each registered handler creates a `Cron` instance that fires on the
 * scheduled tick. `dispose()` stops all cron jobs gracefully — wired
 * by the bootstrap on SIGTERM.
 */

import { Cron } from 'croner';
import { type CronHandler, CronPort, type CronSpec } from '@/shared-kernel/jobs/cron.port';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';

export class CronerCronAdapter extends CronPort implements Lifecycle {
  private readonly jobs: Cron[] = [];

  register(spec: CronSpec, handler: CronHandler): void {
    const job = new Cron(spec.pattern, { timezone: spec.tz }, () => {
      void handler();
    });
    this.jobs.push(job);
  }

  async dispose(): Promise<void> {
    for (const job of this.jobs) job.stop();
    this.jobs.length = 0;
  }
}
