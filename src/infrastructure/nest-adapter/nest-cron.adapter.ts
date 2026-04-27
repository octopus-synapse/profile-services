/**
 * Nest adapter for `CronPort`. Builds a `CronJob` from each registered
 * spec and hands it to the `SchedulerRegistry` so `@nestjs/schedule`
 * still owns the actual tick. Caller code stops using `@Cron` — it
 * registers handlers in composition functions instead.
 */

import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { type CronHandler, CronPort, type CronSpec } from '@/shared-kernel/jobs/cron.port';

@Injectable()
export class NestCronAdapter extends CronPort {
  constructor(private readonly registry: SchedulerRegistry) {
    super();
  }

  register(spec: CronSpec, handler: CronHandler): void {
    const job = new CronJob(
      spec.pattern,
      () => {
        void handler();
      },
      null,
      true,
      spec.tz,
    );
    const id = `cron_${spec.pattern.replace(/\W+/g, '_')}_${Math.random().toString(36).slice(2, 8)}`;
    this.registry.addCronJob(
      id,
      job as unknown as Parameters<SchedulerRegistry['addCronJob']>[1],
    );
  }
}
