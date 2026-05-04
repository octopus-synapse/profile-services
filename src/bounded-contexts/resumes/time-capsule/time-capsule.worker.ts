import type { LoggerPort } from '@/shared-kernel';
import type { TimeCapsuleService } from './time-capsule.service';

const CTX = 'TimeCapsuleWorker';

/**
 * Framework-free POJO. Wired by the time-capsule module via
 * `CronPort` (Nest cron adapter lives in
 * `infrastructure/nest-adapter/nest-cron.adapter.ts`).
 *
 * Schedule: daily at 08:30 UTC — early enough to land in the morning
 * inbox.
 */
export class TimeCapsuleWorker {
  constructor(
    private readonly service: TimeCapsuleService,
    private readonly logger: LoggerPort,
  ) {}

  async run(): Promise<void> {
    try {
      const result = await this.service.sendAnniversaries();
      this.logger.log(`Time capsule: ${result.sent} sent / ${result.checked} checked`, CTX);
    } catch (err) {
      this.logger.error(`Time capsule failed: ${err instanceof Error ? err.message : 'unknown'}`, { context: CTX, stack: err instanceof Error ? err.stack : undefined });
    }
  }
}
