/**
 * Redis Connection Manager
 * Single Responsibility: Manage Redis client connection lifecycle
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppLoggerService } from '../logger/logger.service';

const REDIS_DEFAULT_PORT = 6379;
const RETRY_DELAY_MAX = 2000;
const RETRY_DELAY_MULTIPLIER = 50;
const MAX_RETRIES_PER_REQUEST = 3;

@Injectable()
export class RedisConnectionService implements OnModuleDestroy {
  private _client: Redis | null = null;
  private _isEnabled: boolean;

  constructor(private readonly logger: AppLoggerService) {
    const redisHost = process.env.REDIS_HOST;
    const redisPort = parseInt(process.env.REDIS_PORT ?? String(REDIS_DEFAULT_PORT), 10);
    const redisPassword = process.env.REDIS_PASSWORD;

    this._isEnabled = !!redisHost;

    if (this._isEnabled && redisHost) {
      this.initializeClient(redisHost, redisPort, redisPassword);
    } else {
      this.logger.warn('Redis not configured - caching disabled', 'RedisConnectionService');
    }
  }

  private initializeClient(host: string, port: number, password?: string): void {
    try {
      this._client = new Redis({
        host,
        port,
        password,
        retryStrategy: (times) => Math.min(times * RETRY_DELAY_MULTIPLIER, RETRY_DELAY_MAX),
        maxRetriesPerRequest: MAX_RETRIES_PER_REQUEST,
      });

      this._client.on('connect', () => {
        this.logger.log('Redis connected successfully', 'RedisConnectionService');
      });

      this._client.on('error', (error) => {
        this.logger.error('Redis connection error', error.stack, 'RedisConnectionService', {
          error: error.message,
        });
      });
    } catch (error) {
      this.logger.error(
        'Failed to initialize Redis client',
        error instanceof Error ? error.stack : undefined,
        'RedisConnectionService',
      );
      this._isEnabled = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this._client) {
      try {
        await this._client.quit();
        this.logger.log('Redis connection closed', 'RedisConnectionService');
      } catch (error) {
        // Ignore errors during shutdown
        this.logger.warn('Error closing Redis connection', 'RedisConnectionService', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this._client = null;
      }
    }
  }

  get client(): Redis | null {
    return this._client;
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }
}
