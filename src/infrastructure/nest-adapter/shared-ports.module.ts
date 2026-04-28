import { Global, Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtPort } from '@/shared-kernel/auth/jwt.port';
import { ConfigPort } from '@/shared-kernel/config/config.port';
import { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import { CronPort } from '@/shared-kernel/jobs/cron.port';
import { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import {
  BullMQJobQueueAdapter,
  redisConnectionProvider,
  REDIS_CONNECTION,
  type RedisConnection,
} from './bullmq-job-queue.adapter';
import { NestConfigAdapter } from './nest-config.adapter';
import { NestCronAdapter } from './nest-cron.adapter';
import { NestJwtAdapter } from './nest-jwt.adapter';
import { NestSseStreamAdapter } from './nest-sse-stream.adapter';

/**
 * Globally registers framework-free ports backed by Nest adapters so every
 * bounded context can depend on the port instead of `@nestjs/*` packages.
 *
 * Wires:
 *  - `ConfigPort` → `NestConfigAdapter` (`@nestjs/config`)
 *  - `JwtPort` → `NestJwtAdapter` (`@nestjs/jwt`)
 *  - `JobQueuePort` → `BullMQJobQueueAdapter` (`bullmq`)
 *  - `CronPort` → `NestCronAdapter` (`@nestjs/schedule`)
 *  - `SseStreamPort` → `NestSseStreamAdapter` (`@nestjs/event-emitter`)
 */
@Global()
@Module({
  // `EventEmitterModule.forRoot()` is registered once globally by
  // `EventBusModule` (also `@Global()`), so `EventEmitter2` is
  // available for `NestSseStreamAdapter` to inject without a duplicate
  // registration here.
  imports: [ScheduleModule.forRoot()],
  providers: [
    // Config
    { provide: ConfigPort, useClass: NestConfigAdapter },
    // Jobs
    redisConnectionProvider,
    { provide: JobQueuePort, useClass: BullMQJobQueueAdapter },
    { provide: CronPort, useClass: NestCronAdapter },
    // SSE — confines `EventEmitter2` to the adapter; route handlers and
    // bundles consume the framework-free port.
    { provide: SseStreamPort, useClass: NestSseStreamAdapter },
    // Jwt — note: a JwtModule registration is still required at the BC level
    // (each BC's *.module.ts that uses JwtPort must `imports: [JwtModule.register*]`).
    {
      provide: JwtPort,
      useFactory: (jwt: JwtService) => new NestJwtAdapter(jwt),
      inject: [JwtService],
    },
  ],
  exports: [ConfigPort, JobQueuePort, CronPort, JwtPort, SseStreamPort],
})
export class SharedPortsModule {}

export { REDIS_CONNECTION, type RedisConnection };
