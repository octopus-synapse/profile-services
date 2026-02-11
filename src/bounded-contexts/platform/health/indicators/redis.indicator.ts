import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly cacheService: CacheService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isEnabled = this.cacheService.isEnabled;

    if (!isEnabled) {
      return this.getStatus(key, true, {
        message: 'Redis not configured (graceful degradation)',
        configured: false,
      });
    }

    try {
      // Try to ping Redis via a simple get/set operation
      const testKey = '__health_check__';
      const testValue = Date.now().toString();
      await this.cacheService.set(testKey, testValue, 5);
      const retrieved = await this.cacheService.get<string>(testKey);

      if (retrieved === testValue) {
        return this.getStatus(key, true, {
          message: 'Redis is connected',
          configured: true,
        });
      }

      throw new Error('Redis get/set verification failed');
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
          configured: true,
        }),
      );
    }
  }
}
