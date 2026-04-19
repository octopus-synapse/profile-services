import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AntiGhostingService } from './anti-ghosting.service';

@Injectable()
export class AntiGhostingWorker {
  private readonly logger = new Logger(AntiGhostingWorker.name);

  constructor(private readonly service: AntiGhostingService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async run(): Promise<void> {
    try {
      const result = await this.service.scanAndNotify();
      this.logger.log(
        `Anti-ghosting scan: ${result.scanned} apps checked, ${result.reminded} reminders sent`,
      );
    } catch (err) {
      this.logger.error(
        `Anti-ghosting scan failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
