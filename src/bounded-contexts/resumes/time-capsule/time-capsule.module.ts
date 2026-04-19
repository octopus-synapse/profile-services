import { Module } from '@nestjs/common';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { TimeCapsuleService } from './time-capsule.service';
import { TimeCapsuleWorker } from './time-capsule.worker';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [TimeCapsuleService, TimeCapsuleWorker],
  exports: [TimeCapsuleService],
})
export class TimeCapsuleModule {}
