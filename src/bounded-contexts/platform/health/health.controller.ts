import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import {
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  StorageHealthIndicator,
  TranslateHealthIndicator,
} from './indicators';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
    private redis: RedisHealthIndicator,
    private storage: StorageHealthIndicator,
    private translate: TranslateHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () => this.storage.isHealthy('storage'),
      () => this.translate.isHealthy('translate'),
    ]);
  }

  @Public()
  @Get('db')
  @HealthCheck()
  checkDatabase(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy('database')]);
  }

  @Public()
  @Get('redis')
  @HealthCheck()
  checkRedis(): Promise<HealthCheckResult> {
    return this.health.check([() => this.redis.isHealthy('redis')]);
  }

  @Public()
  @Get('storage')
  @HealthCheck()
  checkStorage(): Promise<HealthCheckResult> {
    return this.health.check([() => this.storage.isHealthy('storage')]);
  }

  @Public()
  @Get('translate')
  @HealthCheck()
  checkTranslate(): Promise<HealthCheckResult> {
    return this.health.check([() => this.translate.isHealthy('translate')]);
  }
}
