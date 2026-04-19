import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TimeCapsuleService } from './time-capsule.service';

@Injectable()
export class TimeCapsuleWorker {
  private readonly logger = new Logger(TimeCapsuleWorker.name);

  constructor(private readonly service: TimeCapsuleService) {}

  // Daily at 08:30 UTC — early enough to land in the morning inbox.
  @Cron('30 8 * * *')
  async run(): Promise<void> {
    try {
      const result = await this.service.sendAnniversaries();
      this.logger.log(`Time capsule: ${result.sent} sent / ${result.checked} checked`);
    } catch (err) {
      this.logger.error(`Time capsule failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }
}
