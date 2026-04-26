import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoggerPort } from '@/shared-kernel';
import { SkillDecayService } from './skill-decay.service';

const CTX = 'SkillDecayWorker';

@Injectable()
export class SkillDecayWorker {
  constructor(
    private readonly service: SkillDecayService,
    private readonly logger: LoggerPort,
  ) {}

  // Every Sunday 02:00 UTC — off-peak, cheap query.
  @Cron('0 2 * * 0')
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
        undefined,
        CTX,
      );
    }
  }
}
