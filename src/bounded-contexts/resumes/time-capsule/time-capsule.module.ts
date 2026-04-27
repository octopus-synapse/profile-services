import { Module } from '@nestjs/common';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { LoggerPort } from '@/shared-kernel';
import { CronPort } from '@/shared-kernel/jobs/cron.port';
import { TimeCapsuleService } from './time-capsule.service';
import { TimeCapsuleWorker } from './time-capsule.worker';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [
    TimeCapsuleService,
    // Side-effect provider: registers the daily time-capsule cron tick
    // against the global CronPort at module-init time.
    {
      provide: 'TIME_CAPSULE_JOBS_REGISTERED',
      useFactory: (cron: CronPort, service: TimeCapsuleService, logger: LoggerPort) => {
        const worker = new TimeCapsuleWorker(service, logger);
        // Daily 08:30 UTC.
        cron.register({ pattern: '30 8 * * *' }, worker.run.bind(worker));
        return true;
      },
      inject: [CronPort, TimeCapsuleService, LoggerPort],
    },
  ],
  exports: [TimeCapsuleService],
})
export class TimeCapsuleModule {}
