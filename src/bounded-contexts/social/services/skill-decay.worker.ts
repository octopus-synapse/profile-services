import type { LoggerPort } from '@/shared-kernel';
import type { SkillDecayService } from './skill-decay.service';

const CTX = 'SkillDecayWorker';

/**
 * Framework-free POJO. Wired by the social module via `CronPort`
 * (Nest cron adapter lives in
 * `infrastructure/nest-adapter/nest-cron.adapter.ts`).
 *
 * Schedule: every Sunday 02:00 UTC — off-peak, cheap query.
 */
export class SkillDecayWorker {
  constructor(
    private readonly service: SkillDecayService,
    private readonly logger: LoggerPort,
  ) {}

  async run(): Promise<void> {
    try {
      const result = await this.service.scanAndFlag();
      this.logger.log(
        `Skill decay: ${result.scanned} stale rows scanned, ${result.flagged} notifications emitted`,
        CTX,
      );
    } catch (err) {
      this.logger.error(
        `Skill decay scan failed: ${err instanceof Error ? err.message : 'unknown'}`,
        { context: CTX },
      );
    }
  }
}
