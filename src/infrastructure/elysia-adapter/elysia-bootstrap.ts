/**
 * Production Elysia bootstrap (Phase 2 cutover). Boots all migrated
 * BCs on Elysia + Bun, end-to-end framework-free pipeline:
 *  - PinoLoggerAdapter   (LoggerPort)
 *  - JoseJwtAdapter      (JwtPort)
 *  - JoseAuthExtractorAdapter (AuthExtractorPort)
 *  - InMemorySseStreamAdapter (SseStreamPort)
 *  - errorMapper / requestLogging / authExtractor / responseWrapper
 *  - Cookie jar drained from `ctx.state` on every response
 *  - Lifecycle: composition lifecycles[] init in order, dispose reverse
 *    on SIGTERM/SIGINT.
 *
 * Default port is 3010 (the original Nest port). Set `PORT` to override.
 *
 * Run via: `bun --bun src/infrastructure/elysia-adapter/elysia-bootstrap.ts`
 * (or via `src/main.ts`, which delegates here).
 */

import { PrismaClient } from '@prisma/client';
import Elysia from 'elysia';
import { buildAiComposition } from '@/bounded-contexts/ai/ai.composition';
import { buildAdminAnalyticsComposition } from '@/bounded-contexts/analytics/admin/admin-analytics.composition';
import { buildPlatformEventsComposition } from '@/bounded-contexts/analytics/platform-events/platform-events.composition';
import { buildResumeAnalyticsComposition } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.composition';
import { buildSearchComposition } from '@/bounded-contexts/analytics/search/search.composition';
import { buildShareAnalyticsComposition } from '@/bounded-contexts/analytics/share-analytics/share-analytics.composition';
import { CuratedSelectorService } from '@/bounded-contexts/automation/application/services/curated-selector.service';
import { buildAutomationComposition } from '@/bounded-contexts/automation/automation.composition';
import { ResumeAnalyticsJobMatcherAdapter } from '@/bounded-contexts/automation/infrastructure/adapters/external-services/resume-analytics-job-matcher.adapter';
import { buildBadgesComposition } from '@/bounded-contexts/badges/badges.composition';
import { buildCareerGraphComposition } from '@/bounded-contexts/career-graph/career-graph.composition';
import { buildCollaborationComposition } from '@/bounded-contexts/collaboration/collaboration.composition';
import { buildDslComposition } from '@/bounded-contexts/dsl/dsl.composition';
import { buildExportComposition } from '@/bounded-contexts/export/export.composition';
import { buildFeedComposition } from '@/bounded-contexts/feed/feed.composition';
import {
  buildFitProfileBundle,
  buildFitProfileComposition,
} from '@/bounded-contexts/fit-profile/fit-profile.composition';
import { buildAccountLifecycleUseCases } from '@/bounded-contexts/identity/account-lifecycle/account-lifecycle.composition';
import { accountLifecycleRoutes } from '@/bounded-contexts/identity/account-lifecycle/account-lifecycle.routes';
import { buildAuthenticationUseCases } from '@/bounded-contexts/identity/authentication/authentication.composition';
import { authenticationRoutes } from '@/bounded-contexts/identity/authentication/authentication.routes';
import { accessModifierRoutes } from '@/bounded-contexts/identity/authorization/access-modifier.routes';
import { buildAuthorizationUseCases } from '@/bounded-contexts/identity/authorization/authorization.composition';
import { buildEmailVerificationUseCases } from '@/bounded-contexts/identity/email-verification/email-verification.composition';
import { emailVerificationRoutes } from '@/bounded-contexts/identity/email-verification/email-verification.routes';
import {
  buildOAuthComposition,
  buildOAuthUseCases,
} from '@/bounded-contexts/identity/oauth/oauth.composition';
import { buildPasswordManagementUseCases } from '@/bounded-contexts/identity/password-management/password-management.composition';
import { passwordManagementRoutes } from '@/bounded-contexts/identity/password-management/password-management.routes';
import {
  buildTwoFactorAuthComposition,
  buildTwoFactorAuthUseCases,
} from '@/bounded-contexts/identity/two-factor-auth/two-factor-auth.composition';
import { buildShadowProfileUseCases } from '@/bounded-contexts/identity/users/shadow-profile/shadow-profile.composition';
import { shadowProfileRoutes } from '@/bounded-contexts/identity/users/shadow-profile/shadow-profile.routes';
import { buildUiStateUseCases } from '@/bounded-contexts/identity/users/ui-state/ui-state.composition';
import { uiStateRoutes } from '@/bounded-contexts/identity/users/ui-state/ui-state.routes';
import { buildUsersUseCases } from '@/bounded-contexts/identity/users/users.composition';
import { usersRoutes } from '@/bounded-contexts/identity/users/users.routes';
import { buildImportComposition } from '@/bounded-contexts/import/import.composition';
import { buildMecSyncUseCases } from '@/bounded-contexts/integration/mec-sync/mec-sync.composition';
import { mecSyncRoutes } from '@/bounded-contexts/integration/mec-sync/mec-sync.routes';
import { buildUploadComposition } from '@/bounded-contexts/integration/upload/upload.composition';
import { buildJobMatchComposition } from '@/bounded-contexts/job-match/job-match.composition';
import { buildJobsComposition } from '@/bounded-contexts/jobs/jobs.composition';
import { buildNotificationsComposition } from '@/bounded-contexts/notifications/notifications.composition';
import { buildOnboardingComposition } from '@/bounded-contexts/onboarding/onboarding.composition';
import { onboardingRoutes } from '@/bounded-contexts/onboarding/onboarding.routes';
import { buildAuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.composition';
import { CacheInvalidationService } from '@/bounded-contexts/platform/common/cache/services/cache-invalidation.service';
import { buildEmailComposition } from '@/bounded-contexts/platform/common/email/email.composition';
import { buildPlatformUseCases } from '@/bounded-contexts/platform/common/platform.composition';
import { platformRoutes } from '@/bounded-contexts/platform/common/platform.routes';
import { buildRateLimitService } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.composition';
import { buildS3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.composition';
import { buildHealthComposition } from '@/bounded-contexts/platform/health/health.composition';
import { buildI18nComposition } from '@/bounded-contexts/platform/i18n/i18n.composition';
import { buildMetricsComposition } from '@/bounded-contexts/platform/metrics/metrics.composition';
import { buildRealtimeComposition } from '@/bounded-contexts/platform/realtime/realtime.composition';
import { createPrismaClientOptions } from '@/bounded-contexts/platform/prisma/prisma-client-options';
import { buildTestRunnerComposition } from '@/bounded-contexts/platform/test-runner/test-runner.composition';
import { testRunnerRoutes } from '@/bounded-contexts/platform/test-runner/test-runner.routes';
import { buildUiMetadataComposition } from '@/bounded-contexts/platform/ui-metadata/ui-metadata.composition';
import { buildWebhooksComposition } from '@/bounded-contexts/platform/webhooks/webhooks.composition';
import { buildPublicResumesComposition } from '@/bounded-contexts/presentation/public-resumes/public-resumes.composition';
import { buildRecruitingComposition } from '@/bounded-contexts/recruiting/recruiting.composition';
import { buildResumeQualityComposition } from '@/bounded-contexts/resume-quality/resume-quality.composition';
import { buildResumeStylesComposition } from '@/bounded-contexts/resume-styles/resume-styles.composition';
import { buildResumesCoreComposition } from '@/bounded-contexts/resumes/core/resumes.composition';
import { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import { resumesRoutes } from '@/bounded-contexts/resumes/core/resumes.routes';
import { ResumeEventPublisherAdapter } from '@/bounded-contexts/resumes/infrastructure/adapters/resume-event-publisher.adapter';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories/section-type.repository';
import { buildResumeVersionsComposition } from '@/bounded-contexts/resumes/resume-versions/resume-versions.composition';
import { buildAdminSectionTypesComposition } from '@/bounded-contexts/resumes/section-types/application/admin-section-types.composition';
import { buildTimeCapsuleComposition } from '@/bounded-contexts/resumes/time-capsule/time-capsule.composition';
import { buildAdminCatalogUseCases } from '@/bounded-contexts/skills-catalog/admin/admin-catalog.composition';
import { buildSkillsCatalogCompositions } from '@/bounded-contexts/skills-catalog/skills-catalog.composition';
import { buildSocialComposition } from '@/bounded-contexts/social/social.composition';
import { buildSuccessStoriesComposition } from '@/bounded-contexts/success-stories/success-stories.composition';
import { buildTranslationComposition } from '@/bounded-contexts/translation/translation.composition';
import { translationRoutes } from '@/bounded-contexts/translation/translation.routes';
import { EventPublisher } from '@/shared-kernel/event-bus/event-publisher';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';
import { BullMQJobQueueAdapter } from './bullmq-job-queue.adapter';
import { CacheIdempotencyAdapter } from './cache-idempotency.adapter';
import { CacheRateLimiter } from './cache-rate-limit.adapter';
import { CronerCronAdapter } from './croner-cron.adapter';
import { buildDefaultPipeline } from './elysia-pipeline';
import { mountRoutes } from './elysia-route-mounter';
import { InMemoryCacheAdapter } from './in-memory-cache.adapter';
import { InMemoryCacheLockAdapter } from './in-memory-cache-lock.adapter';
import { InMemorySseStreamAdapter } from './in-memory-sse-stream.adapter';
import { JoseAuthExtractorAdapter } from './jose-auth-extractor.adapter';
import { JoseJwtAdapter } from './jose-jwt.adapter';
import { NullFeatureFlagsAdapter } from './null-feature-flags.adapter';
import { PinoLoggerAdapter } from './pino-logger.adapter';
import { PrismaUserSnapshotAdapter } from './prisma-user-snapshot.adapter';
import { ProcessEnvConfigAdapter } from './process-env-config.adapter';
import { applySecurityHeaders, enableCors } from './security-headers';

export interface BootstrapHandle {
  /** Live Elysia instance (server already listening). */
  readonly app: Elysia;
  /** PrismaClient already connected — reused by test harnesses. */
  readonly prisma: PrismaClient;
  /** Stop the listener + drain lifecycles (reverse order). Idempotent. */
  stop(): Promise<void>;
}

export async function bootstrap(): Promise<BootstrapHandle> {
  // --- Framework-free port impls ---
  const config = new ProcessEnvConfigAdapter();
  const logger = new PinoLoggerAdapter();
  const jwt = new JoseJwtAdapter({
    secret: config.getOrDefault<string>('JWT_SECRET', 'dev-secret-change-me'),
    issuer: config.get<string>('JWT_ISSUER'),
    audience: config.get<string>('JWT_AUDIENCE'),
  });
  const prisma = new PrismaClient(createPrismaClientOptions());
  await prisma.$connect();
  logger.log('Prisma connected', 'ElysiaBootstrap');

  const userSnapshot = new PrismaUserSnapshotAdapter(prisma);
  // Cache is needed by the auth extractor (token-valid-after gate) and
  // by every BC that takes `CachePort`. Construct early so it can be
  // injected here; the remaining adapters keep their original order.
  const cache = new InMemoryCacheAdapter();
  const authExtractor = new JoseAuthExtractorAdapter(
    jwt,
    { cookieName: config.getOrDefault<string>('AUTH_COOKIE_NAME', 'access_token') },
    userSnapshot,
    cache,
  );

  // Redis-backed adapters (BullMQ, optional Redis cache) emit
  // connection errors via the global uncaughtException channel when
  // they fail before a listener attaches. The bootstrap-level handler
  // logs and survives — production deploys with a healthy Redis won't
  // hit it, dev without Redis won't crash because of it.
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception swallowed: ${err.message}`, err.stack, 'ElysiaBootstrap');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(
      `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
      reason instanceof Error ? reason.stack : undefined,
      'ElysiaBootstrap',
    );
  });

  // --- Lifecycle registry: init in order, dispose reverse on shutdown ---
  const lifecycles: Lifecycle[] = [
    {
      dispose: async () => {
        await prisma.$disconnect();
        logger.log('Prisma disconnected', 'ElysiaBootstrap');
      },
    },
  ];

  // --- Infra port adapters (shared by BCs) ---
  // (`cache` is constructed earlier so the auth extractor can read it.)
  const sseStream = new InMemorySseStreamAdapter();
  const cron = new CronerCronAdapter();
  const eventBus = new EventPublisher();
  lifecycles.push(cron);

  // BullMQ-backed JobQueuePort. Opt-in via `ENABLE_BULLMQ=true` —
  // when off, the bootstrap uses a no-op queue so dev environments
  // boot without a working Redis. Production sets the flag and gets
  // the real BullMQ worker pool with `dispose()` wired into shutdown.
  const enableBullmq = config.getOrDefault<string>('ENABLE_BULLMQ', 'false') === 'true';
  const redisHost = config.get<string>('REDIS_HOST');
  const queue =
    enableBullmq && redisHost
      ? new BullMQJobQueueAdapter(
          {
            host: redisHost,
            port: Number(config.getOrDefault<string>('REDIS_PORT', '6379')),
            password: config.get<string>('REDIS_PASSWORD'),
          },
          logger,
        )
      : ({
          register: () => {},
          enqueue: async () => {},
          schedule: async () => {},
        } as never);
  if (enableBullmq && redisHost) {
    lifecycles.push(queue as BullMQJobQueueAdapter);
    logger.log(`BullMQ connected to ${redisHost}`, 'ElysiaBootstrap');
  } else {
    logger.warn(
      `JobQueuePort is a no-op (ENABLE_BULLMQ=${enableBullmq}, REDIS_HOST=${redisHost ?? 'unset'})`,
      'ElysiaBootstrap',
    );
  }

  // Idempotency: cache-backed lock semantics. Replaces the deleted
  // Nest `IdempotencyService` (which transitively pulled CacheLockService
  // + AppLoggerService and TDZ-hit `LoggerPort`).
  const idempotency = new CacheIdempotencyAdapter(cache, logger);

  // --- Cross-cutting service factories (no routes; consumed by BCs) ---
  const { emailService } = buildEmailComposition(config, logger);
  const s3 = buildS3UploadService(config, logger);
  const ai = buildAiComposition(config, logger);
  await ai.init();
  logger.log('AI adapter initialized', 'ElysiaBootstrap');

  const i18n = buildI18nComposition(logger);

  // --- BC compositions (framework-free) ---
  // Wired today: BCs whose deps are all available in the bootstrap.
  // Pending: automation (needs ResumeTailorService); feed (needs
  // NotificationsUseCases); jobs (needs ResumeAnalyticsFacade +
  // EventPublisherPort); notifications (needs CachePort/QueuePort/CronPort
  // adapters instantiated). They land as those services migrate.
  const badges = buildBadgesComposition(prisma as never, logger);
  const successStories = buildSuccessStoriesComposition(prisma as never, logger);
  const careerGraph = buildCareerGraphComposition(prisma as never);
  const uiMetadata = buildUiMetadataComposition(prisma as never, logger);
  const realtime = buildRealtimeComposition({ eventBus });
  for (const l of realtime.lifecycles ?? []) lifecycles.push(l);
  const dsl = buildDslComposition(prisma as never, logger);
  const oauth = buildOAuthComposition(prisma as never, logger, config);
  const oauthUseCases = buildOAuthUseCases(prisma as never, logger, config);
  const importBc = buildImportComposition({
    prisma: prisma as never,
    logger,
    llm: ai.bundle.llm,
    getOAuthAccessToken: oauthUseCases.getOAuthAccessToken,
  });
  const recruiting = buildRecruitingComposition(prisma as never);
  const fitProfile = buildFitProfileComposition(prisma as never, eventBus, logger);
  const metrics = buildMetricsComposition(logger);
  const webhooks = buildWebhooksComposition(prisma as never, logger);

  // Notifications: needs cache + sse + queue (skipped — Redis-bound) +
  // cron + eventBus + email. The cron/queue scheduler bits are wrapped
  // by `lifecycles[0].init()` inside the composition.
  const notifications = buildNotificationsComposition(
    prisma as never,
    emailService,
    cache,
    logger,
    sseStream,
    eventBus,
    queue,
    cron,
  );
  for (const binding of notifications.eventHandlers ?? []) {
    eventBus.on(binding.eventType, binding.handler);
  }
  for (const l of notifications.lifecycles ?? []) lifecycles.push(l);

  // Resume versions: uses ai.bundle.llm + ResumeEventPublisherAdapter
  // wrapping the shared EventBus.
  const resumeEvents = new ResumeEventPublisherAdapter(eventBus);
  const resumeVersions = buildResumeVersionsComposition(
    prisma as never,
    logger,
    ai.bundle.llm,
    resumeEvents,
  );

  // Resume analytics facade — needed by jobs. Registers cron + handlers
  // on its own bundle. Handlers need cross-BC adapters not yet in scope
  // (recorder/tracker/projection/idempotency); for the POC we skip
  // registerHandlers and only mount routes + register cron.
  const resumeAnalytics = buildResumeAnalyticsComposition(
    prisma as never,
    sseStream,
    eventBus,
    eventBus,
    logger,
  );
  resumeAnalytics.registerCron(cron);

  // Feed needs notifications.useCases.createNotification + s3.
  const feed = buildFeedComposition(prisma as never, logger, s3, {
    createNotification: notifications.useCases.createNotification,
  });

  // Jobs needs llm + resumeAnalytics facade + email + eventBus.
  const jobs = buildJobsComposition(
    prisma as never,
    emailService,
    logger,
    eventBus,
    ai.bundle.llm,
    resumeAnalytics.useCases,
  );

  // Social: idempotency is the cache-backed `CacheIdempotencyAdapter`
  // wired above (lock semantics over `CachePort.acquireLock`).
  const social = buildSocialComposition({
    prisma: prisma as never,
    logger,
    eventPublisher: eventBus,
    eventBus,
    idempotency: idempotency as never,
    sse: sseStream,
    cron,
  });
  for (const binding of social.eventHandlers ?? []) {
    eventBus.on(binding.eventType, binding.handler);
  }
  for (const l of social.lifecycles ?? []) lifecycles.push(l);

  // Automation: needs CuratedSelectorService (uses ResumeAnalyticsFacade
  // via ResumeAnalyticsJobMatcherAdapter) + ResumeTailorService (from
  // resume-versions composition).
  const matcher = new ResumeAnalyticsJobMatcherAdapter(resumeAnalytics.useCases);
  const selector = new CuratedSelectorService(prisma as never, matcher, logger);
  const automation = buildAutomationComposition(
    prisma as never,
    logger,
    selector,
    resumeVersions.tailor,
  );

  // Collaboration: chat / sharing / admin slices over a single bundle.
  const collaboration = buildCollaborationComposition({
    prisma: prisma as never,
    cache,
    eventPublisher: eventBus,
    logger,
  });

  // Presentation (public-resumes).
  const publicResumes = buildPublicResumesComposition({
    prisma: prisma as never,
    cache,
    events: eventBus,
    logger,
    publicAppUrl: config.getOrDefault<string>('PUBLIC_APP_URL', 'http://localhost:3000'),
  });

  // Export: needs resumes repos + dsl bundle. The Section type repo
  // owns a Prisma-backed in-memory cache initialized via `init()`, so
  // hand it to `lifecycles` so the bootstrap drains it on startup.
  const resumesRepository = new ResumesRepository(prisma as never, logger);
  const sectionTypeRepo = new SectionTypeRepository(prisma as never, logger);
  // Soft-fail init: in local dev the DB role often doesn't have access
  // to the section-type catalog table; let the bootstrap continue so
  // the rest of the BCs can serve. Production deploys will fail loudly
  // if this query genuinely can't run.
  lifecycles.push({
    init: async () => {
      try {
        await sectionTypeRepo.init();
      } catch (err) {
        logger.warn(
          `SectionTypeRepository init failed (continuing): ${err instanceof Error ? err.message : String(err)}`,
          'ElysiaBootstrap',
        );
      }
    },
  });
  const exportBc = buildExportComposition({
    prisma: prisma as never,
    resumesRepository,
    sectionTypeRepo,
    s3,
    config,
    eventPublisher: eventBus,
    logger,
    dsl: { renderResumeDsl: dsl.useCases.renderResumeDsl },
  });

  // --- Phase-1 final batch: all 33 newly-migrated BCs ---
  // Service factories first (no routes; consumed by other compositions).
  const auditLog = buildAuditLogService(prisma as never, logger);
  const rateLimit = buildRateLimitService(cache as never);
  // FitProfile bundle to extract `similarity` for job-match cross-BC dep.
  const fitProfileBundle = buildFitProfileBundle(prisma as never, eventBus, logger);
  void rateLimit;

  // Identity sub-BCs.
  const twoFactorAuth = buildTwoFactorAuthComposition(prisma as never, cache as never, logger);
  const twoFaUseCases = buildTwoFactorAuthUseCases(prisma as never, cache as never, logger);
  // Authentication is built first so we can hand its `tokenGenerator`
  // and `createSession` to account-lifecycle as real impls instead of
  // stubs.
  const authenticationUseCases = buildAuthenticationUseCases(
    prisma as never,
    cache as never,
    config as never,
    jwt,
    eventBus as never,
    eventBus as never,
    twoFaUseCases.validate2fa,
    logger,
  );
  const authentication = authenticationUseCases as never;
  const accountLifecycle = buildAccountLifecycleUseCases(
    prisma as never,
    auditLog,
    config as never,
    eventBus as never,
    authenticationUseCases.tokenGenerator,
    authenticationUseCases.createSession,
    logger,
  ) as never;
  const authorization = buildAuthorizationUseCases(prisma as never, eventBus, logger);
  // Real EmailService satisfies `EmailServicePort` structurally
  // (`sendEmail({to, subject, template, context})`).
  const emailVerification = buildEmailVerificationUseCases(
    prisma as never,
    emailService as never,
    config as never,
    eventBus as never,
    logger,
  ) as never;
  const passwordManagement = buildPasswordManagementUseCases(
    prisma as never,
    cache as never,
    emailService as never,
    config as never,
    eventBus as never,
    logger,
  ) as never;
  const users = buildUsersUseCases(
    prisma as never,
    resumesRepository,
    authorization.authService as never,
    logger,
  ) as never;
  const shadowProfile = buildShadowProfileUseCases(prisma as never, logger) as never;
  const uiState = buildUiStateUseCases(prisma as never) as never;

  // Analytics sub-BCs.
  const adminAnalytics = buildAdminAnalyticsComposition(prisma as never, logger);
  const platformEvents = buildPlatformEventsComposition(prisma as never, logger, config);
  const search = buildSearchComposition(prisma as never);
  const shareAnalytics = buildShareAnalyticsComposition(prisma as never, logger);
  for (const binding of shareAnalytics.eventHandlers ?? []) {
    eventBus.on(binding.eventType, binding.handler);
  }

  // Integration.
  const upload = buildUploadComposition(s3, logger);

  // Onboarding consumes typst services exposed by export composition.
  const cacheLock = new InMemoryCacheLockAdapter();
  const onboarding = buildOnboardingComposition({
    prisma: prisma as never,
    logger,
    auditLog,
    cacheLock: cacheLock as never,
    sseStream,
    dsl: { renderResumeDsl: dsl.useCases.renderResumeDsl },
    typstSerializer: exportBc.typstDataSerializer,
    typstCompiler: exportBc.typstCompiler,
  } as never) as never;

  // Resumes sub-BCs. `versionService` comes from resume-versions;
  // `cacheInvalidation` is a thin POJO over CachePort + LoggerPort.
  // `flags` defaults to off until Redis-backed feature-flags lands;
  // shared with resume-quality + job-match below.
  const cacheInvalidation = new CacheInvalidationService(cache, logger);
  const flags = new NullFeatureFlagsAdapter();
  // resumes-core's use-cases consume `ResumeEventPublisher` (typed
  // `publishResumeCreated/Updated/Deleted/...`), not the raw EventBus.
  // Reuse the adapter built above for resume-versions so handlers'
  // calls land on a function instead of `undefined`.
  const resumesCore = buildResumesCoreComposition(
    prisma as never,
    resumeVersions.versionService as never,
    resumeEvents as never,
    cacheInvalidation as never,
    logger,
  ) as never;
  const adminSectionTypes = buildAdminSectionTypesComposition(prisma as never, logger);
  const timeCapsule = buildTimeCapsuleComposition(prisma as never, emailService, logger, cron);

  // Resume quality + styles. `flags` shared with job-match.
  const resumeQuality = buildResumeQualityComposition(
    prisma as never,
    ai.bundle.scoringLlm,
    flags as never,
    eventBus,
    logger,
    queue,
  ) as never;
  for (const binding of (
    resumeQuality as {
      eventHandlers?: Array<{ eventType: string; handler: (e: never) => Promise<void> | void }>;
    }
  ).eventHandlers ?? []) {
    eventBus.on(binding.eventType, binding.handler);
  }
  const resumeStyles = buildResumeStylesComposition(
    prisma as never,
    exportBc.useCases as never,
    eventBus,
    logger,
  ) as never;

  // Skills catalog (parent + sub-BCs).
  const skillsCatalog = buildSkillsCatalogCompositions(prisma as never, cache as never, logger);
  const skillsCatalogAdmin = buildAdminCatalogUseCases(prisma as never, logger);

  // Translation.
  const translation = buildTranslationComposition(
    config.getOrDefault<string>('LIBRETRANSLATE_URL', 'http://localhost:5000'),
    logger,
  ) as never;

  // MEC sync — public catalog routes (`/api/v1/mec/...`).
  const mecSync = buildMecSyncUseCases(prisma as never, cache as never, logger);

  // Platform common — public enums + admin dashboard/alerts/stats.
  const platformUseCases = buildPlatformUseCases(
    prisma as never,
    logger,
    (authorization as { authService: unknown }).authService as never,
    sectionTypeRepo as never,
  );

  // Test runner consumes the real social services.
  const testRunner = buildTestRunnerComposition(
    prisma as never,
    logger,
    social.useCases.connectionService as never,
    social.useCases.followService as never,
  ) as never;

  // Job-match: shares the `flags` null-object declared above with
  // resume-quality, until the Redis-backed feature-flags BC is wired.
  const jobMatch = buildJobMatchComposition({
    prisma: prisma as never,
    cache: cache as never,
    flags: flags as never,
    embeddings: ai.bundle.embeddings,
    scoringLlm: ai.bundle.scoringLlm,
    similarity: fitProfileBundle.extras.similarity,
    notifications: notifications.useCases,
    eventBus,
    eventPublisher: eventBus,
    queue,
    logger,
  } as never) as never;
  for (const binding of (
    jobMatch as {
      eventHandlers?: Array<{ eventType: string; handler: (e: never) => Promise<void> | void }>;
    }
  ).eventHandlers ?? []) {
    eventBus.on(binding.eventType, binding.handler);
  }

  void shadowProfile;
  void uiState;
  void emailVerification;
  void passwordManagement;
  void accountLifecycle;
  void authentication;
  void authorization;
  void users;
  void resumesCore;
  void timeCapsule;
  void translation;
  void testRunner;
  void skillsCatalog;
  void skillsCatalogAdmin;
  void onboarding;

  // Health BC — descriptor-driven `/api/health[/live|/ready]`.
  const health = buildHealthComposition({
    prisma: prisma as never,
    cache,
    version: config.getOrDefault<string>('APP_VERSION', '0.0.0-dev'),
    startedAt: new Date(),
  });

  // --- Pipeline ---
  // The permission checker reuses `authorization.checks.checkPermissionUseCase`
  // (built by buildAuthorizationCheckUseCases). Wrapping it in the
  // `{ check(userId, resource, action): Promise<boolean> }` shape the
  // pipeline expects keeps the stage framework-free.
  const permissionChecker = {
    check: async (userId: string, resource: string, action: string): Promise<boolean> => {
      return (
        authorization as unknown as {
          checks: {
            checkPermissionUseCase: { execute(u: string, r: string, a: string): Promise<boolean> };
          };
        }
      ).checks.checkPermissionUseCase.execute(userId, resource, action);
    },
  };
  const pipeline = buildDefaultPipeline({
    logger,
    authExtractor,
    i18n: i18n.translation,
    skipTosCheck: config.getOrDefault<string>('SKIP_TOS_CHECK', 'false') === 'true',
    permissionChecker,
    rateLimiter: new CacheRateLimiter(cache),
  });

  // --- Mount routes on Elysia ---
  // CORS + security-header defaults are wired here so they apply to
  // every route uniformly. Origin allowlist is environment-driven —
  // wildcard is rejected outside development to avoid the
  // OWASP A05 misconfiguration.
  const app = new Elysia();
  const corsOrigin = config.getOrDefault<string>('CORS_ORIGIN', '');
  const allowedOrigins = corsOrigin
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  enableCors(app, {
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    isProduction: config.get('NODE_ENV') === 'production',
  });
  applySecurityHeaders(app);
  for (const bc of [
    badges,
    successStories,
    careerGraph,
    uiMetadata,
    realtime,
    dsl,
    oauth,
    importBc,
    recruiting,
    fitProfile,
    i18n,
    webhooks,
    notifications,
    resumeVersions,
    resumeAnalytics,
    feed,
    jobs,
    social,
    automation,
    collaboration,
    publicResumes,
    exportBc,
    metrics,
    // Phase-1 final batch (with `as never` to keep the loop's structural
    // type tractable across heterogeneous bundle shapes):
    twoFactorAuth as never,
    adminAnalytics,
    platformEvents,
    search,
    shareAnalytics,
    upload,
    adminSectionTypes,
    resumeQuality,
    resumeStyles,
    jobMatch,
    health,
  ] as const) {
    mountRoutes(app, { bundle: bc.useCases, routes: bc.routes }, { prefix: '/api', pipeline });
  }

  // BCs whose composition functions return raw useCases instead of
  // `{ useCases, routes }`. We import the route arrays directly and
  // mount them against the bundle the route file expects.
  const extra: ReadonlyArray<{ bundle: unknown; routes: unknown }> = [
    { bundle: accountLifecycle, routes: accountLifecycleRoutes },
    {
      bundle: (authenticationUseCases as { bundle: unknown }).bundle,
      routes: authenticationRoutes,
    },
    { bundle: emailVerification, routes: emailVerificationRoutes },
    { bundle: passwordManagement, routes: passwordManagementRoutes },
    { bundle: (users as { bundle: unknown }).bundle, routes: usersRoutes },
    {
      bundle: (shadowProfile as { shadowProfileService: unknown }).shadowProfileService,
      routes: shadowProfileRoutes,
    },
    { bundle: uiState, routes: uiStateRoutes },
    {
      bundle: (translation as { useCases: unknown }).useCases ?? translation,
      routes: translationRoutes,
    },
    { bundle: mecSync, routes: mecSyncRoutes },
    { bundle: platformUseCases, routes: platformRoutes },
    {
      bundle: (testRunner as { useCases: unknown }).useCases ?? testRunner,
      routes: testRunnerRoutes,
    },
    {
      bundle: (onboarding as { useCases: unknown }).useCases ?? onboarding,
      routes: onboardingRoutes,
    },
    {
      bundle: (resumesCore as { useCases: unknown }).useCases ?? resumesCore,
      routes: resumesRoutes,
    },
    // resumesCore exposes two extra bundles via `.management` and
    // `.genericSections` — mount their routes so admin resume actions
    // (`/v1/resumes/manage/...`) and section-type endpoints
    // (`/v1/resumes/:resumeId/sections/...`) actually resolve.
    {
      bundle: (resumesCore as { management: { useCases: unknown } }).management.useCases,
      routes: (resumesCore as { management: { routes: unknown } }).management.routes,
    },
    {
      bundle: (resumesCore as { genericSections: { useCases: unknown } }).genericSections.useCases,
      routes: (resumesCore as { genericSections: { routes: unknown } }).genericSections.routes,
    },
    { bundle: skillsCatalog.admin.useCases, routes: skillsCatalog.admin.routes },
    { bundle: skillsCatalog.skills.useCases, routes: skillsCatalog.skills.routes },
    {
      bundle: skillsCatalog.spokenLanguages.useCases,
      routes: skillsCatalog.spokenLanguages.routes,
    },
    { bundle: skillsCatalog.techSkills.useCases, routes: skillsCatalog.techSkills.routes },
    { bundle: skillsCatalog.techSkills.services.sync, routes: skillsCatalog.techSkills.syncRoutes },
    {
      bundle: (authorization as { accessModifier: unknown }).accessModifier,
      routes: accessModifierRoutes,
    },
  ];
  for (const e of extra) {
    mountRoutes(
      app,
      { bundle: e.bundle as never, routes: e.routes as never },
      { prefix: '/api', pipeline },
    );
  }

  // SSE bundles use a different bundle type than the BC's main
  // useCases — mount them separately.
  mountRoutes(
    app,
    { bundle: notifications.sseBundle, routes: notifications.sseRoutes },
    { prefix: '/api', pipeline },
  );
  mountRoutes(
    app,
    { bundle: resumeAnalytics.sseBundle, routes: [] as never },
    { prefix: '/api', pipeline },
  );
  if (social.sseBundle) {
    mountRoutes(
      app,
      { bundle: social.sseBundle, routes: social.sseRoutes },
      { prefix: '/api', pipeline },
    );
  }

  // Health endpoint to prove the server is up.
  // `/api/health[/live|/ready]` are mounted via the health BC's Route descriptors above.

  // --- Run lifecycles.init in order ---
  for (const l of lifecycles) await l.init?.();

  const port = Number(process.env.PORT ?? 3010);
  app.listen(port);
  logger.log(`Elysia listening on http://localhost:${port}`, 'ElysiaBootstrap');
  logger.log(
    `Try: curl http://localhost:${port}/api/v1/badges/user/test-user-id`,
    'ElysiaBootstrap',
  );

  // --- SIGTERM / SIGINT: dispose in reverse order ---
  let stopped = false;
  const drainLifecycles = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    for (const l of [...lifecycles].reverse()) {
      try {
        await l.dispose?.();
      } catch (err) {
        logger.error(
          `Lifecycle dispose failed: ${err instanceof Error ? err.message : String(err)}`,
          err instanceof Error ? err.stack : undefined,
          'ElysiaBootstrap',
        );
      }
    }
  };
  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal}, shutting down...`, 'ElysiaBootstrap');
    await drainLifecycles();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  return {
    app,
    prisma,
    async stop(): Promise<void> {
      await app.stop();
      await drainLifecycles();
    },
  };
}

// Direct-execution entry: `bun --bun src/infrastructure/elysia-adapter/elysia-bootstrap.ts`.
// `src/main.ts` imports `bootstrap` and runs it explicitly, in which
// case this guard is a no-op (the import.meta.main check distinguishes
// "module imported elsewhere" from "module run as entry script").
if (import.meta.main)
  void bootstrap().catch((err) => {
    process.stderr.write(`Bootstrap failed: ${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });
