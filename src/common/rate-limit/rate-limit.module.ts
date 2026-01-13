/**
 * Rate Limit Module
 *
 * Provides granular rate limiting for API endpoints.
 * Integrates with cache service for distributed rate limiting.
 *
 * Uncle Bob: "Modules encapsulate cohesive functionality"
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [CacheModule],
  providers: [RateLimitService, RateLimitGuard],
  exports: [RateLimitService, RateLimitGuard],
})
export class RateLimitModule {}
