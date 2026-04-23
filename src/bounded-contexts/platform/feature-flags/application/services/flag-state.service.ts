import { Injectable, OnModuleInit } from '@nestjs/common';
import { FeatureFlagRepositoryPort } from '../../domain/ports/feature-flag.repository.port';
import type { FlagRecord } from '../../domain/types';
import { RedisFlagCache } from '../../infrastructure/cache/redis-flag-cache.service';

/**
 * In-process snapshot of all flag records, refreshed from the DB on demand
 * and invalidated via the Redis pub/sub channel.
 *
 * The DB is cheap enough to re-read on every change, and keeping the full set
 * in memory lets evaluation and impact analysis walk the graph without
 * hitting Postgres per request.
 */
@Injectable()
export class FlagStateService implements OnModuleInit {
  private flags: FlagRecord[] = [];
  private loaded = false;
  private inflight: Promise<void> | null = null;

  constructor(
    private readonly repo: FeatureFlagRepositoryPort,
    private readonly cache: RedisFlagCache,
  ) {}

  async onModuleInit(): Promise<void> {
    this.cache.onInvalidate(() => {
      this.loaded = false;
    });
  }

  async getAll(): Promise<FlagRecord[]> {
    if (!this.loaded) await this.load();
    return this.flags;
  }

  markStale(): void {
    this.loaded = false;
  }

  private async load(): Promise<void> {
    if (this.inflight) {
      await this.inflight;
      return;
    }
    this.inflight = (async () => {
      this.flags = await this.repo.findAll();
      this.loaded = true;
    })();
    try {
      await this.inflight;
    } finally {
      this.inflight = null;
    }
  }
}
