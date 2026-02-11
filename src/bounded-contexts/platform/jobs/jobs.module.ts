import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ExportProcessor } from './processors/export.processor';
import { QueueService } from './queue.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 3600,
          },
        },
      }),
    }),
    BullModule.registerQueue({ name: 'export' }),
    BullModule.registerQueue({ name: 'email' }),
    BullModule.registerQueue({ name: 'import' }),
    BullModule.registerQueue({ name: 'sync' }),
    BullModule.registerQueue({ name: 'cleanup' }),
    BullModule.registerQueue({ name: 'analytics' }),
  ],
  providers: [QueueService, ExportProcessor],
  exports: [QueueService, BullModule],
})
export class JobsModule {}
