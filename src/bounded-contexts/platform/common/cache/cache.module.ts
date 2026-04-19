import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { LoggerModule } from '../logger/logger.module';
import { CacheService } from './cache.service';
import { CacheLockService } from './cache-lock.service';
import { RedisConnectionService } from './redis-connection.service';
import {
  CacheCoreService,
  CacheInvalidationService,
  CachePatternsService,
  CacheWarmingService,
} from './services';

@Global()
@Module({
  imports: [LoggerModule, PrismaModule],
  providers: [
    RedisConnectionService,
    CacheLockService,
    CacheCoreService,
    CachePatternsService,
    CacheInvalidationService,
    CacheWarmingService,
    CacheService,
    IdempotencyService,
  ],
  exports: [
    CacheService,
    CacheCoreService,
    CachePatternsService,
    CacheInvalidationService,
    CacheWarmingService,
    RedisConnectionService,
    CacheLockService,
    IdempotencyService,
  ],
})
export class CacheModule {}
