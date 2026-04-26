import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoggerPort } from '@/shared-kernel';
import { TimeCapsuleService } from './time-capsule.service';

const CTX = 'TimeCapsuleWorker';

@Injectable()
export class TimeCapsuleWorker {
  constructor(
    private readonly service: TimeCapsuleService,
    private readonly logger: LoggerPort,
  ) {}

  // Daily at 08:30 UTC — early enough to land in the morning inbox.
  @Cron('30 8 * * *')
  async run(): Promise<void> {
    try {
      const result = await this.service.sendAnniversaries();
      this.logger.log(`Time capsule: ${result.sent} sent / ${result.checked} checked`, CTX);
    } catch (err) {
      this.logger.error(
        `Time capsule failed: ${err instanceof Error ? err.message : 'unknown'}`,
        err instanceof Error ? err.stack : undefined,
        CTX,
      );
    }
  }
}
