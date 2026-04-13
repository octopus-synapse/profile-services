import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { JobController } from './controllers/job.controller';
import { JobService } from './services/job.service';

@Module({
  imports: [PrismaModule],
  controllers: [JobController],
  providers: [JobService],
  exports: [JobService],
})
export class JobsModule {}
