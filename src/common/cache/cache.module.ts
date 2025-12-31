import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisConnectionService } from './redis-connection.service';
import { CacheLockService } from './cache-lock.service';
import { CacheCoreService, CachePatternsService } from './services';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [
    RedisConnectionService,
    CacheLockService,
    CacheCoreService,
    CachePatternsService,
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
