/**
 * jobs:ingest-external — fire ONE JSearch ingestion batch manually
 * (same code path the 06:00 América/São_Paulo cron runs). Spends real
 * RapidAPI credits: worst case 6 (3 queries × num_pages=2), counted
 * against the `jsearch:quota:YYYY-MM` Redis counter like any cron run.
 *
 * Usage (needs DATABASE_URL, REDIS_*, JSEARCH_RAPIDAPI_KEY/HOST):
 *   bun run src/scripts/run-external-jobs-ingestion.ts
 *
 * Prefer running inside the dev backend container so the docker-network
 * hostnames in .env resolve:
 *   docker exec profile-backend-dev bun run src/scripts/run-external-jobs-ingestion.ts
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { ExternalJobsIngestionService } from '../bounded-contexts/jobs/application/services/external-jobs-ingestion.service';
import { JSearchQuotaService } from '../bounded-contexts/jobs/application/services/jsearch-quota.service';
import { JSearchJobSearchAdapter } from '../bounded-contexts/jobs/infrastructure/adapters/external-services/jsearch-job-search.adapter';
import { PrismaExternalJobListingsRepository } from '../bounded-contexts/jobs/infrastructure/adapters/persistence/prisma-external-job-listings.repository';
import { createPrismaClientOptions } from '../bounded-contexts/platform/prisma/prisma-client-options';
import { RedisCacheAdapter } from '../infrastructure/elysia-adapter/redis-cache.adapter';
import { ConsoleLoggerAdapter } from '../shared-kernel/logger';

async function main(): Promise<void> {
  const apiKey = process.env.JSEARCH_RAPIDAPI_KEY;
  const apiHost = process.env.JSEARCH_RAPIDAPI_HOST;
  if (!apiKey || !apiHost) {
    console.error('JSEARCH_RAPIDAPI_KEY / JSEARCH_RAPIDAPI_HOST not set — aborting.');
    process.exit(1);
  }

  const logger = new ConsoleLoggerAdapter();
  const prisma = new PrismaClient(createPrismaClientOptions());
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  });

  try {
    const service = new ExternalJobsIngestionService(
      new JSearchJobSearchAdapter(apiKey, apiHost, logger),
      new PrismaExternalJobListingsRepository(prisma as never),
      new JSearchQuotaService(new RedisCacheAdapter(redis)),
      logger,
    );
    const summary = await service.run();
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
    redis.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
