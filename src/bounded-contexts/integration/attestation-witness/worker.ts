import { setTimeout as wait } from 'node:timers/promises';
import { NestFactory } from '@nestjs/core';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { AttestationWitnessWorkerModule } from './attestation-witness-worker.module';
import { AttestationWitnessWorkerService } from './services/attestation-witness-worker.service';

const DEFAULT_POLL_INTERVAL_MS = 2000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AttestationWitnessWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  const logger = app.get(AppLoggerService);
  const worker = app.get(AttestationWitnessWorkerService);
  const pollInterval = Number(
    process.env.ATTESTATION_WITNESS_POLL_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL_MS,
  );

  logger.log('Attestation witness worker started', 'AttestationWitnessWorker');

  try {
    while (true) {
      const processedRun = await worker.processNextPendingRun();
      await wait(processedRun ? 0 : pollInterval);
    }
  } finally {
    await app.close();
  }
}

void bootstrap();
