import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import {
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  StorageHealthIndicator,
  TranslateHealthIndicator,
} from './indicators';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { TranslationModule } from '../translation/translation.module';

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
