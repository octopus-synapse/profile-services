import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisConnectionService } from './redis-connection.service';
import { CacheLockService } from './cache-lock.service';

@Global()
@Module({
  providers: [RedisConnectionService, CacheLockService, CacheService],
  exports: [CacheService],
})
export class CacheModule {}
