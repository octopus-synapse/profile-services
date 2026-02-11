import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { UploadModule } from '@/bounded-contexts/integration/upload/upload.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { TranslationModule } from '@/bounded-contexts/translation/translation/translation.module';
import { HealthController } from './health.controller';
import {
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  StorageHealthIndicator,
  TranslateHealthIndicator,
} from './indicators';

@Module({
  imports: [TerminusModule, PrismaModule, UploadModule, TranslationModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    StorageHealthIndicator,
    TranslateHealthIndicator,
  ],
})
export class HealthModule {}
