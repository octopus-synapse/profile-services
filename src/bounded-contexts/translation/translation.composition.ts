/**
 * Translation BC composition.
 *
 * Two halves: the HTTP surface (health, detect, translate-now, status) and
 * the bilingual write-through (ADR-003) — a debounced job per résumé change,
 * consumed by a worker the bootstrap registers through the `workers` loop.
 */

import type { Observable } from 'rxjs';
import type { TranslationLlmPort } from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import type { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeCreatedEvent, ResumeUpdatedEvent } from '@/bounded-contexts/resumes/domain/events';
import type { LoggerPort } from '@/shared-kernel';
import type {
  BcEventBinding,
  BcWorkerBinding,
  BoundedContextComposition,
} from '@/shared-kernel/composition';
import type { SseEvent, SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import {
  ResumeTranslationService,
  TranslationCoreService,
  TranslationService,
} from './application/services';
import {
  TranslateResumeIntoLocaleUseCase,
  type TranslationPricing,
} from './application/use-cases/translate-resume-into-locale/translate-resume-into-locale.use-case';
import type { ResumeTranslationStorePort } from './domain/ports/resume-translation-store.port';
import type { TranslationProgress } from './domain/ports/translation-progress.port';
import { PrismaResumeTranslationStoreAdapter } from './infrastructure/adapters/persistence/prisma-resume-translation-store.adapter';
import { PrismaTranslationCostLedgerAdapter } from './infrastructure/adapters/persistence/prisma-translation-cost-ledger.adapter';
import {
  SseTranslationProgressAdapter,
  translationProgressChannel,
} from './infrastructure/adapters/sse-translation-progress.adapter';
import { TranslationOnResumeChangedHandler } from './infrastructure/handlers/translation-on-resume-changed.handler';
import {
  RESUME_TRANSLATION_QUEUE,
  type ResumeTranslationJobData,
  ResumeTranslationWorker,
} from './infrastructure/workers/resume-translation.worker';
import { translationRoutes } from './translation.routes';

export { ResumeTranslationService, TranslationCoreService, TranslationService };

/** What the routes see. */
export interface TranslationBundle {
  readonly service: TranslationService;
  readonly translateResume: TranslateResumeIntoLocaleUseCase;
  readonly store: ResumeTranslationStorePort;
  /** The user's live channel of translation progress (SSE route). */
  readonly subscribeToProgress: (userId: string) => Observable<SseEvent<TranslationProgress>>;
}

export interface BuildTranslationDeps {
  readonly translationLlm: TranslationLlmPort;
  readonly logger: LoggerPort;
  readonly prisma: PrismaService;
  readonly queue: JobQueuePort;
  readonly sse: SseStreamPort;
  readonly flags: FeatureFlagService;
  readonly pricing: TranslationPricing;
}

export interface TranslationComposition extends BoundedContextComposition<TranslationBundle> {
  /** Enqueue a derivation without the debounce — used right after onboarding commits. */
  readonly deriveNow: (resumeId: string) => Promise<void>;
}

export function buildTranslationComposition(deps: BuildTranslationDeps): TranslationComposition {
  const { translationLlm, logger, prisma, queue, sse, flags, pricing } = deps;
  const core = new TranslationCoreService(translationLlm, logger);
  const resume = new ResumeTranslationService(translationLlm);
  const service = new TranslationService(core, resume);

  const store = new PrismaResumeTranslationStoreAdapter(prisma, logger);
  const ledger = new PrismaTranslationCostLedgerAdapter(prisma, logger);
  const progress = new SseTranslationProgressAdapter(sse, logger);
  const translateResume = new TranslateResumeIntoLocaleUseCase(
    store,
    translationLlm,
    ledger,
    progress,
    flags,
    pricing,
    logger,
  );

  const onChanged = new TranslationOnResumeChangedHandler(queue, logger);
  const eventHandlers: ReadonlyArray<BcEventBinding> = [
    { eventType: ResumeUpdatedEvent.TYPE, handler: onChanged.onResumeChanged.bind(onChanged) },
    { eventType: ResumeCreatedEvent.TYPE, handler: onChanged.onResumeChanged.bind(onChanged) },
  ];

  const worker = new ResumeTranslationWorker(translateResume, logger);
  const workers: ReadonlyArray<BcWorkerBinding> = [
    {
      queue: RESUME_TRANSLATION_QUEUE,
      process: worker.process.bind(
        worker,
      ) as BcWorkerBinding<ResumeTranslationJobData>['process'] as BcWorkerBinding['process'],
    },
  ];

  return {
    useCases: {
      service,
      translateResume,
      store,
      subscribeToProgress: (userId) =>
        sse.subscribe<TranslationProgress>(translationProgressChannel(userId)),
    },
    routes: translationRoutes,
    eventHandlers,
    workers,
    deriveNow: (resumeId) =>
      queue.enqueue<ResumeTranslationJobData>(
        RESUME_TRANSLATION_QUEUE,
        { kind: 'derive', resumeId },
        { jobId: `resume-translation:${resumeId}` },
      ),
  };
}
