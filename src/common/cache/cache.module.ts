import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisConnectionService } from './redis-connection.service';
import { CacheLockService } from './cache-lock.service';
import {
  CacheCoreService,
  CachePatternsService,
  CacheInvalidationService,
  CacheWarmingService,
} from './services';
import { LoggerModule } from '../logger/logger.module';
import { PrismaModule } from '../../prisma/prisma.module';

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
  ],
  exports: [
    CacheService,
    CacheCoreService,
    CachePatternsService,
    CacheInvalidationService,
    CacheWarmingService,
    RedisConnectionService,
    CacheLockService,
  ],
})
export class CacheModule {}
