import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import { runGuardedJob } from '@/shared-kernel/jobs';
import type { SkillDecayService } from './skill-decay.service';

const CTX = 'SkillDecayWorker';
// p99: weekly scan over the skill catalog completes well under 10 minutes.
const EXPECTED_DURATION_MS = 10 * 60_000;

/**
 * Framework-free POJO. Wired by the social module via `CronPort`
 * (Nest cron adapter lives in
 * `infrastructure/nest-adapter/nest-cron.adapter.ts`).
 *
 * Schedule: every Sunday 02:00 UTC — off-peak, cheap query.
 *
 * P0-010: wrapped with `runGuardedJob` so multi-instance deploys don't
 * double-flag stale skills.
 */
export class SkillDecayWorker {
  constructor(
    private readonly service: SkillDecayService,
    private readonly logger: LoggerPort,
    private readonly lock: DistributedLockPort,
  ) {}

  async run(): Promise<void> {
    await runGuardedJob(
      {
        name: CTX,
        expectedDurationMs: EXPECTED_DURATION_MS,
        failureMode: 'LOG_AND_CONTINUE',
        lock: this.lock,
        logger: this.logger,
      },
      async () => {
        const result = await this.service.scanAndFlag();
        this.logger.log(
          `Skill decay: ${result.scanned} stale rows scanned, ${result.flagged} notifications emitted`,
          CTX,
        );
      },
    );
  }
}
