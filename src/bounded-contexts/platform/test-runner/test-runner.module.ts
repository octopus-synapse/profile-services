import { Module } from '@nestjs/common';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SocialModule } from '@/bounded-contexts/social/social.module';
import { TestRunnerController } from './test-runner.controller';
import { TestRunnerService } from './test-runner.service';

@Module({
  imports: [PrismaModule, LoggerModule, SocialModule],
  controllers: [TestRunnerController],
  providers: [TestRunnerService],
})
export class TestRunnerModule {}
