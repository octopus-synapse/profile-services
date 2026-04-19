import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SkillDecayService } from './skill-decay.service';

@Injectable()
export class SkillDecayWorker {
  private readonly logger = new Logger(SkillDecayWorker.name);

  constructor(private readonly service: SkillDecayService) {}

  // Every Sunday 02:00 UTC — off-peak, cheap query.
  @Cron('0 2 * * 0')
  async run(): Promise<void> {
    try {
      const result = await this.service.scanAndFlag();
      this.logger.log(
        `Skill decay: ${result.scanned} stale rows scanned, ${result.flagged} notifications emitted`,
      );
    } catch (err) {
      this.logger.error(
        `Skill decay scan failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
