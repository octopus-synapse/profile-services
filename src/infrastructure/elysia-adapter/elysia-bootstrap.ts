// lint-allow-file-size: existing offender before V2; rebase onto #231 added well-known route registration + CORS allowlist merge. Sub-module extraction (separate composition fns per BC group) tracked for follow-up refactor PR.
/**
 * Production Elysia bootstrap (Phase 2 cutover). Boots all migrated
 * BCs on Elysia + Bun, end-to-end framework-free pipeline:
 *  - AppLoggerService    (LoggerPort, Winston-backed)
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
import { PrismaCuratedSelectorRepository } from '@/bounded-contexts/automation/infrastructure/adapters/persistence/prisma-curated-selector.repository';
import { buildBadgesComposition } from '@/bounded-contexts/badges/badges.composition';
import { buildCareerGraphComposition } from '@/bounded-contexts/career-graph/career-graph.composition';
import { buildCollaborationComposition } from '@/bounded-contexts/collaboration/collaboration.composition';
import { buildCompaniesComposition } from '@/bounded-contexts/companies/companies.composition';
import { buildDslComposition } from '@/bounded-contexts/dsl/dsl.composition';
import {
  ExportCompletedEvent,
  ExportFailedEvent,
  ExportRequestedEvent,
} from '@/bounded-contexts/export/domain/events';
import { buildExportComposition } from '@/bounded-contexts/export/export.composition';
import { ExportAuditHandler } from '@/bounded-contexts/export/infrastructure/handlers/export-audit.handler';
import { buildFeedComposition } from '@/bounded-contexts/feed/feed.composition';
import {
  buildFitProfileBundle,
  buildFitProfileComposition,
} from '@/bounded-contexts/fit-profile/fit-profile.composition';
import { buildGeoComposition } from '@/bounded-contexts/geo/geo.composition';
import { buildAccountLifecycleUseCases } from '@/bounded-contexts/identity/account-lifecycle/account-lifecycle.composition';
import { accountLifecycleRoutes } from '@/bounded-contexts/identity/account-lifecycle/account-lifecycle.routes';
import { buildAuthenticationUseCases } from '@/bounded-contexts/identity/authentication/authentication.composition';
import { authenticationRoutes } from '@/bounded-contexts/identity/authentication/authentication.routes';
import {
  LoginFailedEvent,
  SessionCreatedEvent,
  SessionTerminatedEvent,
  TokenRefreshedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
} from '@/bounded-contexts/identity/authentication/domain/events';
import { AuthAuditHandler } from '@/bounded-contexts/identity/authentication/infrastructure/handlers/auth-audit.handler';
import { accessModifierRoutes } from '@/bounded-contexts/identity/authorization/access-modifier.routes';
import { buildAuthorizationUseCases } from '@/bounded-contexts/identity/authorization/authorization.composition';
import { AuthorizationCheckAdapter } from '@/bounded-contexts/identity/authorization/infrastructure/adapters/authorization-check.adapter';
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
import { buildGitHubIntegrationUseCases } from '@/bounded-contexts/integration/github/github.composition';
import { githubRoutes } from '@/bounded-contexts/integration/github/github.routes';
import { buildMecSyncUseCases } from '@/bounded-contexts/integration/mec-sync/mec-sync.composition';
import { mecSyncRoutes } from '@/bounded-contexts/integration/mec-sync/mec-sync.routes';
import { buildUploadComposition } from '@/bounded-contexts/integration/upload/upload.composition';
import { InvalidateMatchCacheOnJobUpdatedHandler } from '@/bounded-contexts/job-match/infrastructure/handlers/invalidate-match-cache-on-job-updated.handler';
import { buildJobMatchComposition } from '@/bounded-contexts/job-match/job-match.composition';
import { JobUpdatedEvent } from '@/bounded-contexts/jobs/domain/events';
import {
  buildJobsComposition,
  isExternalJobsIngestionEnabled,
  registerJobsJobs,
} from '@/bounded-contexts/jobs/jobs.composition';
import { buildNotificationsComposition } from '@/bounded-contexts/notifications/notifications.composition';
import {
  buildOnboardingComposition,
  type OnboardingDeps,
} from '@/bounded-contexts/onboarding/onboarding.composition';
import { onboardingRoutes } from '@/bounded-contexts/onboarding/onboarding.routes';
import { buildAuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.composition';
import { AuditLogServiceAdapter } from '@/bounded-contexts/platform/common/audit/audit-log-port.adapter';
import { RedisConnectionService } from '@/bounded-contexts/platform/common/cache/redis-connection.service';
import { CacheInvalidationService } from '@/bounded-contexts/platform/common/cache/services/cache-invalidation.service';
import { buildEmailComposition } from '@/bounded-contexts/platform/common/email/email.composition';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { buildPlatformUseCases } from '@/bounded-contexts/platform/common/platform.composition';
import { platformRoutes } from '@/bounded-contexts/platform/common/platform.routes';
import { buildRateLimitService } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.composition';
import { buildS3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.composition';
import { buildConfigComposition } from '@/bounded-contexts/platform/config/config.composition';
import { buildFeatureFlagsComposition } from '@/bounded-contexts/platform/feature-flags/feature-flags.composition';
import { RedisFlagCache } from '@/bounded-contexts/platform/feature-flags/infrastructure/cache/redis-flag-cache.service';
import { SseFlagStream } from '@/bounded-contexts/platform/feature-flags/infrastructure/sse/sse-flag-stream.service';
import { buildHealthComposition } from '@/bounded-contexts/platform/health/health.composition';
import { buildI18nComposition } from '@/bounded-contexts/platform/i18n/i18n.composition';
import { buildMetricsComposition } from '@/bounded-contexts/platform/metrics/metrics.composition';
import { createPrismaClientOptions } from '@/bounded-contexts/platform/prisma/prisma-client-options';
import { buildRealtimeComposition } from '@/bounded-contexts/platform/realtime/realtime.composition';
import { buildTestRunnerComposition } from '@/bounded-contexts/platform/test-runner/test-runner.composition';
import { testRunnerRoutes } from '@/bounded-contexts/platform/test-runner/test-runner.routes';
import { buildUiMetadataComposition } from '@/bounded-contexts/platform/ui-metadata/ui-metadata.composition';
import { buildWebhooksComposition } from '@/bounded-contexts/platform/webhooks/webhooks.composition';
import { buildWellKnownComposition } from '@/bounded-contexts/platform/well-known/well-known.composition';
import { buildPublicResumesComposition } from '@/bounded-contexts/presentation/public-resumes/public-resumes.composition';
import { ShareDownloadedEvent } from '@/bounded-contexts/presentation/shared-kernel/domain/events/share-downloaded.event';
import { buildRecruitingComposition } from '@/bounded-contexts/recruiting/recruiting.composition';
import { buildResumeQualityComposition } from '@/bounded-contexts/resume-quality/resume-quality.composition';
import { buildResumeStylesComposition } from '@/bounded-contexts/resume-styles/resume-styles.composition';
import { buildResumesCoreComposition } from '@/bounded-contexts/resumes/core/resumes.composition';
import { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import { resumesRoutes } from '@/bounded-contexts/resumes/core/resumes.routes';
import {
  VersionCreatedEvent,
  VersionRestoredEvent,
} from '@/bounded-contexts/resumes/domain/events';
import { ResumeEventPublisherAdapter } from '@/bounded-contexts/resumes/infrastructure/adapters/resume-event-publisher.adapter';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories/section-type.repository';
import { VersionAuditHandler } from '@/bounded-contexts/resumes/resume-versions/infrastructure/handlers/version-audit.handler';
import { buildResumeVersionsComposition } from '@/bounded-contexts/resumes/resume-versions/resume-versions.composition';
import { buildAdminSectionTypesComposition } from '@/bounded-contexts/resumes/section-types/application/admin-section-types.composition';
import { buildTimeCapsuleComposition } from '@/bounded-contexts/resumes/time-capsule/time-capsule.composition';
import { buildRolesComposition } from '@/bounded-contexts/roles/roles.composition';
import { buildAdminCatalogUseCases } from '@/bounded-contexts/skills-catalog/admin/admin-catalog.composition';
import { buildSkillsCatalogCompositions } from '@/bounded-contexts/skills-catalog/skills-catalog.composition';
import {
  ConnectionRequestedEvent,
  UserFollowedEvent,
} from '@/bounded-contexts/social/domain/events';
import { SocialAuditHandler } from '@/bounded-contexts/social/infrastructure/handlers/social-audit.handler';
import { buildSocialComposition } from '@/bounded-contexts/social/social.composition';
import { buildSuccessStoriesComposition } from '@/bounded-contexts/success-stories/success-stories.composition';
import { buildTranslationComposition } from '@/bounded-contexts/translation/translation.composition';
import { translationRoutes } from '@/bounded-contexts/translation/translation.routes';
import { OwnershipRegistry } from '@/shared-kernel/authorization';
import type { CachePort } from '@/shared-kernel/cache';
import type { CacheInvalidationJob } from '@/shared-kernel/cache/cache-invalidation.queue';
import { EventPublisher } from '@/shared-kernel/event-bus/event-publisher';
import {
  enableTracking as enablePendingHandlerTracking,
  track as trackPendingHandler,
} from '@/shared-kernel/event-bus/pending-handler-tracker';
import { SafeFetchAdapter, SafeFetchStrictAdapter } from '@/shared-kernel/http';
import { buildCorsAllowlist } from '@/shared-kernel/http/cors-allowlist';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';
import { InProcessShutdownOrchestrator } from '@/shared-kernel/lifecycle/on-shutdown.port';
import { assertBullmqRequiredInProd } from './assert-bullmq-required-in-prod';
import { buildCacheAdapter } from './build-cache-adapter';
import {
  applyCacheInvalidation,
  BullMQCacheInvalidationAdapter,
  CACHE_INVALIDATION_QUEUE,
} from './bullmq-cache-invalidation.adapter';
import { BullMQJobQueueAdapter } from './bullmq-job-queue.adapter';
import { CacheIdempotencyAdapter } from './cache-idempotency.adapter';
import { CacheRateLimiter } from './cache-rate-limit.adapter';
import { CronerCronAdapter } from './croner-cron.adapter';
import { buildDefaultPipeline } from './elysia-pipeline';
import { mountRoutes } from './elysia-route-mounter';
import { FetchOAuthAdapter } from './fetch-oauth.adapter';
import { InMemoryCacheLockAdapter } from './in-memory-cache-lock.adapter';
import { InMemorySseStreamAdapter } from './in-memory-sse-stream.adapter';
import { JoseAuthExtractorAdapter } from './jose-auth-extractor.adapter';
import { JoseJwtAdapter } from './jose-jwt.adapter';
import { PrismaUserSnapshotAdapter } from './prisma-user-snapshot.adapter';
import { ProcessEnvConfigAdapter } from './process-env-config.adapter';
import { RedisDistributedLockAdapter } from './redis-distributed-lock.adapter';
import { applySecurityHeaders, enableCors } from './security-headers';

export interface BootstrapHandle {
  /** Live Elysia instance (server already listening). */
  readonly app: Elysia;
  /** PrismaClient already connected — reused by test harnesses. */
  readonly prisma: PrismaClient;
  /** Cache adapter (Redis-backed in dev/e2e/prod, no-op in unit tests
   * without REDIS_HOST). Exposed so test harnesses can reset the
   * rate-limit buckets between specs without spinning their own client. */
  readonly cache: CachePort;
  /** Stop the listener + drain lifecycles (reverse order). Idempotent. */
  stop(): Promise<void>;
}

export async function bootstrap(): Promise<BootstrapHandle> {
  // --- Framework-free port impls ---
  // P0-001: validate the entire env up front. ConfigValidationError is
  // surfaced verbatim so a misconfigured deploy sees every issue in one
  // pass rather than fix-one-hit-the-next.
  let config: ProcessEnvConfigAdapter;
  try {
    config = new ProcessEnvConfigAdapter();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  const logger = new AppLoggerService();

  // Belt-and-suspenders: capture any Promise rejection that escapes
  // both the explicit `.catch` in `bindAuditListener` and the
  // `Pending.track` instrumentation. In production this should be
  // mute after the audit-race fix; if it fires, we want the structured
  // log instead of Node's default stderr dump so the observability
  // pipeline keeps it.
  //
  // Idempotent guard — bootstrap can run twice in dev/HMR; we don't
  // want N copies of the listener fanning out the same error.
  if (!(globalThis as { __unhandledRejectionWired?: boolean }).__unhandledRejectionWired) {
    (globalThis as { __unhandledRejectionWired?: boolean }).__unhandledRejectionWired = true;
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', {
        context: 'Bootstrap',
        stack: reason instanceof Error ? reason.stack : undefined,
        reason: reason instanceof Error ? reason.message : String(reason),
      });
    });
  }

  // P0-001: JWT_SECRET is validated up front by the ConfigPort schema
  // (min 32 chars, required). No fallback default — boot fails before
  // any adapter is constructed if the var is missing.
  const jwt = new JoseJwtAdapter({
    secret: config.env.JWT_SECRET,
    previousSecret: config.env.JWT_SECRET_PREVIOUS,
    issuer: config.env.JWT_ISSUER,
    audience: config.env.JWT_AUDIENCE,
  });
  const prisma = new PrismaClient(createPrismaClientOptions());
  await prisma.$connect();
  logger.log('Prisma connected', 'ElysiaBootstrap');

  const userSnapshot = new PrismaUserSnapshotAdapter(prisma);
  // Cache is needed by the auth extractor (token-valid-after gate) and
  // by every BC that takes `CachePort`. Construct early so it can be
  // injected here; the remaining adapters keep their original order.
  //
  // P1 #10: the selection (Redis vs in-memory) is centralised in
  // `buildCacheAdapter` — production / staging without REDIS_HOST
  // fails fast with ConfigValidationError, dev/test fall back to the
  // in-memory adapter. The factory returns the underlying connection
  // so the bootstrap can register it with the lifecycle list (a
  // future cleanup; today the SIGTERM path already disposes the
  // global Redis client via `sharedRedis` below).
  const { cache } = buildCacheAdapter(config, logger);
  // SafeFetchPort: SSRF-defended HTTP client (P0-013/014).
  // - default: link-preview style (single shot, attacker-untrusted URL)
  // - strict:  webhook-delivery style (DNS-rebinding-resistant, repeated traffic)
  const safeFetch = new SafeFetchAdapter({ defaultTimeoutMs: 5_000 });
  // P1 #45/#46 — pass through `SAFE_FETCH_MAX_BYTES` so operators can
  // tighten the body cap per environment without rebuilding the image.
  // The schema default (5 MB) keeps existing deploys at the same cap.
  const safeFetchStrict = new SafeFetchStrictAdapter({
    defaultTimeoutMs: 15_000,
    maxResponseBytes: config.env.SAFE_FETCH_MAX_BYTES,
  });
  // P0-010: distributed lock — used by `runGuardedJob` to ensure that
  // each scheduled cron worker runs at most once per tick across pods.
  // Redis-backed (SETNX + Lua release) when REDIS_HOST is set. Falls
  // back to a no-op handle in single-instance dev; multi-pod production
  // deploys MUST set REDIS_HOST or this becomes a silent footgun.
  // The connection is registered with `lifecycles` below once that
  // array exists; the same instance is reused by feature-flags too.
  // P1-031 — pass the canonical ConfigPort so the service stops
  // reaching for `process.env.REDIS_*` directly. Falls back to
  // `process.env` only if the call site doesn't pass the port.
  const sharedRedis = new RedisConnectionService(logger as never, config);
  const distributedLock = new RedisDistributedLockAdapter(sharedRedis, logger);
  // P0-004: ownership registry — composition root populates per-BC
  // lookups below; the pipeline `ownershipGuard` stage consults this
  // when a route declares `guards: [{ id: 'ownership', metadata: ... }]`.
  const ownershipRegistry = new OwnershipRegistry();
  // `entity: 'user'` is a self-only check — the requested userId must
  // match the authenticated user. Lookup returns the requested id so
  // the guard's owner-vs-requester equality test is the only gate.
  ownershipRegistry.register('user', (id) => Promise.resolve(id));
  ownershipRegistry.register('resume', async (id) => {
    const row = await prisma.resume.findUnique({
      where: { id },
      select: { userId: true },
    });
    return row?.userId ?? null;
  });
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
  //
  // P0-#16: Node docs are explicit that "the process should be considered
  // to be in an undefined state" after an uncaught exception. Silently
  // surviving meant half-committed Prisma transactions kept serving
  // requests, distributed locks stayed unreleased and memory leaks
  // accumulated for hours. We log, exit(1), and let the supervisor
  // (Docker / k8s / PM2) restart us into a clean state.
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception — exiting process`, {
      context: 'ElysiaBootstrap',
      stack: err.stack,
      message: err.message,
    });
    // Give the logger a tick to flush before the runtime dies.
    setTimeout(() => process.exit(1), 50);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(
      `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
      { context: 'ElysiaBootstrap', stack: reason instanceof Error ? reason.stack : undefined },
    );
  });

  // --- Lifecycle registry: init in order, dispose via OnShutdownPort ---
  // The `lifecycles[]` array remains the source-of-truth for INIT
  // ordering (BC compositions push their own lifecycles into it). For
  // SHUTDOWN, the dispose tasks are forwarded into `onShutdown`
  // (`InProcessShutdownOrchestrator`, Q36) so the canonical port is
  // exercised end-to-end and per-task timeouts apply.
  const onShutdown = new InProcessShutdownOrchestrator(logger);
  const lifecycles: Lifecycle[] = [
    {
      // Inline dispose loses its constructor name; pre-register a named
      // task here instead of relying on the late-stage walk below to
      // synthesise one.
      dispose: async () => {
        await prisma.$disconnect();
        logger.log('Prisma disconnected', 'ElysiaBootstrap');
      },
    },
  ];

  // --- Infra port adapters (shared by BCs) ---
  // (`cache` is constructed earlier so the auth extractor can read it.)
  const sseStream = new InMemorySseStreamAdapter();
  const cron = new CronerCronAdapter(logger);
  const eventBus = new EventPublisher();
  lifecycles.push(cron);

  // BullMQ-backed JobQueuePort. Opt-in via `ENABLE_BULLMQ=true` —
  // when off, the bootstrap uses a no-op queue so dev environments
  // boot without a working Redis. Production / staging MUST provide
  // BOTH ENABLE_BULLMQ=true and REDIS_HOST or the bootstrap refuses
  // to start: the no-op queue silently drops every enqueue() in those
  // envs and we observed real ops outages where the email/notification
  // pipeline went dark for hours (P1 #38).
  assertBullmqRequiredInProd(config);
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
  const ai = buildAiComposition(config, logger, cache);
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
  const realtime = buildRealtimeComposition({ eventBus, logger });
  for (const l of realtime.lifecycles ?? []) lifecycles.push(l);
  const dsl = buildDslComposition(prisma as never, logger);
  // OAuth: framework-free `FetchOAuthAdapter` (replaces passport-* deps).
  // Provider credentials read from env via ConfigPort: each provider only
  // appears in availability/providers list when both id+secret are set.
  const oauthAdapter = new FetchOAuthAdapter({
    github:
      config.get<string>('GITHUB_OAUTH_CLIENT_ID') && config.get<string>('GITHUB_OAUTH_SECRET')
        ? {
            clientId: config.get<string>('GITHUB_OAUTH_CLIENT_ID') as string,
            clientSecret: config.get<string>('GITHUB_OAUTH_SECRET') as string,
          }
        : undefined,
    linkedin:
      config.get<string>('LINKEDIN_OAUTH_CLIENT_ID') && config.get<string>('LINKEDIN_OAUTH_SECRET')
        ? {
            clientId: config.get<string>('LINKEDIN_OAUTH_CLIENT_ID') as string,
            clientSecret: config.get<string>('LINKEDIN_OAUTH_SECRET') as string,
          }
        : undefined,
    google:
      config.get<string>('GOOGLE_OAUTH_CLIENT_ID') && config.get<string>('GOOGLE_OAUTH_SECRET')
        ? {
            clientId: config.get<string>('GOOGLE_OAUTH_CLIENT_ID') as string,
            clientSecret: config.get<string>('GOOGLE_OAUTH_SECRET') as string,
          }
        : undefined,
  });
  const oauth = buildOAuthComposition(prisma as never, logger, config, oauthAdapter);
  const oauthUseCases = buildOAuthUseCases(prisma as never, logger, config, oauthAdapter);
  const importBc = buildImportComposition({
    prisma: prisma as never,
    logger,
    llm: ai.bundle.llm,
    getOAuthAccessToken: oauthUseCases.getOAuthAccessToken,
  });
  const recruiting = buildRecruitingComposition(prisma as never);
  const fitProfile = buildFitProfileComposition(prisma as never, eventBus, logger);
  const metrics = buildMetricsComposition(logger);
  const webhooks = buildWebhooksComposition(prisma as never, logger, safeFetchStrict);

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
    distributedLock,
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
    config,
  );
  resumeAnalytics.registerCron(cron, distributedLock);

  // Feed needs notifications.useCases.createNotification + s3 + cache
  // (P1-028 — short-window cache around the timeline assemble).
  const feed = buildFeedComposition(
    prisma as never,
    logger,
    s3,
    { createNotification: notifications.useCases.createNotification },
    safeFetch,
    cache,
  );

  // Jobs needs llm + resumeAnalytics facade + email + eventBus + safeFetch
  // (P0-#9: job-import-from-url uses safeFetch to block SSRF instead of the
  // raw `fetch` global).
  const jobs = buildJobsComposition(
    prisma as never,
    emailService,
    logger,
    eventBus,
    ai.bundle.llm,
    resumeAnalytics.useCases,
    safeFetch,
    cache,
    config,
  );
  // Cron workers (anti-ghosting sweep + JSearch ingestion). This call was
  // missing in the Elysia bootstrap — `registerJobsJobs` existed but was
  // never invoked, so the anti-ghosting cron is (re)activated here too.
  registerJobsJobs(cron, jobs.useCases, logger, distributedLock, {
    externalIngestionEnabled: isExternalJobsIngestionEnabled(config),
  });

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
    lock: distributedLock,
  });
  for (const binding of social.eventHandlers ?? []) {
    eventBus.on(binding.eventType, binding.handler);
  }
  for (const l of social.lifecycles ?? []) lifecycles.push(l);

  // Automation: needs CuratedSelectorService (uses ResumeAnalyticsFacade
  // via ResumeAnalyticsJobMatcherAdapter) + ResumeTailorService (from
  // resume-versions composition).
  const matcher = new ResumeAnalyticsJobMatcherAdapter(resumeAnalytics.useCases);
  const curatedSelectorRepository = new PrismaCuratedSelectorRepository(prisma as never);
  const selector = new CuratedSelectorService(curatedSelectorRepository, matcher, logger);
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
    // Lazily resolves `authorization` (built below) at request time — used by
    // the chat message-privacy policy (RECRUITERS_ONLY → `job:create`).
    authCheck: new AuthorizationCheckAdapter(() => authorization.checks),
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
    dsl: {
      renderResumeDsl: dsl.useCases.renderResumeDsl,
      renderSampleResumeDsl: dsl.useCases.renderSampleResumeDsl,
      renderInMemoryResumeDsl: dsl.useCases.renderInMemoryResumeDsl,
    },
  });

  // --- Phase-1 final batch: all 33 newly-migrated BCs ---
  // Service factories first (no routes; consumed by other compositions).
  const auditLog = buildAuditLogService(prisma as never, logger);
  const auditPort = new AuditLogServiceAdapter(auditLog, logger);
  const rateLimit = buildRateLimitService(cache as never);
  // FitProfile bundle to extract `similarity` for job-match cross-BC dep.
  const fitProfileBundle = buildFitProfileBundle(prisma as never, eventBus, logger);
  void rateLimit;

  // Feature-flags BC. Replaces `NullFeatureFlagsAdapter` when Redis is
  // available — FF needs `RedisFlagCache` (uses subscribe/publish for
  // cross-instance invalidation) and `SseFlagStream` (fans out
  // invalidate broadcasts to connected clients via `/v1/feature-flags/stream`).
  // When `REDIS_HOST` is unset, RedisConnectionService runs in
  // disabled mode and the cache no-ops, but the BC still serves
  // ListFlags / Toggle / Impact via Prisma. Construction order:
  // FF after auditLog (dep) and before realtime BC (translators
  // subscribe to FlagToggled events; subscriptions are durable so the
  // order is observability-only — clearer to read FF first here).
  // Reuse the `sharedRedis` instance constructed early for the
  // distributed lock — single connection avoids spawning duplicate
  // ioredis clients (each one would consume a CONNECT slot and tick
  // its own retry timers).
  const redisConnection = sharedRedis;
  lifecycles.push(redisConnection);
  const featureFlagsCache = new RedisFlagCache(redisConnection, logger as never, config);
  const featureFlagsSse = new SseFlagStream(featureFlagsCache);
  const featureFlags = buildFeatureFlagsComposition({
    prisma: prisma as never,
    cache: featureFlagsCache,
    sse: featureFlagsSse,
    auditLog,
    eventBus,
    logger,
  });
  for (const l of featureFlags.lifecycles ?? []) lifecycles.push(l);

  // GitHub integration BC. Reads `GITHUB_TOKEN` from config (server-side
  // sync) — for per-user auth flows the import BC reuses
  // `oauthUseCases.getOAuthAccessToken` declared below. The 4 routes
  // (summary/sync/auto-sync/sync-status) are mounted via the standard
  // route mounter loop. Achievement/Contribution services stay internal
  // (consumed by SyncGitHubService during sync, not as REST endpoints).
  const githubIntegration = buildGitHubIntegrationUseCases(prisma as never, logger, config);

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
  // Phase 2: hand the OAuth bundle the session creator so its callback can
  // issue a persistent cookie on web redirects (oauth is built before auth,
  // hence the late bind). Native deep-link redirects ignore it.
  oauth.useCases.createSession = authenticationUseCases.createSession;
  const accountLifecycle = buildAccountLifecycleUseCases(
    prisma as never,
    auditLog,
    config as never,
    eventBus as never,
    authenticationUseCases.createSession,
    logger,
  ) as never;
  const authorization = buildAuthorizationUseCases(prisma as never, eventBus, logger, sharedRedis);
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
    i18n.translation,
    logger,
    auditPort,
    config,
  ) as never;
  const shadowProfile = buildShadowProfileUseCases(prisma as never, logger) as never;
  const uiState = buildUiStateUseCases(prisma as never, logger) as never;
  // Geo lookup BC — `GEO_SOURCE=postgres` uses the GeoNames import, else the
  // bundled dataset baked into the adapter.
  const geo = buildGeoComposition(prisma as never, config as never, logger);
  // Companies BC — logo.dev brand search proxy for the company autocomplete.
  const companies = buildCompaniesComposition(cache, config, logger);
  // Roles BC — ESCO/CBO/O*NET job-title dictionary for the role autocomplete.
  const roles = buildRolesComposition(prisma as never, logger);

  // Analytics sub-BCs.
  const adminAnalytics = buildAdminAnalyticsComposition(prisma as never, logger);
  const platformEvents = buildPlatformEventsComposition(prisma as never, logger, config);
  const search = buildSearchComposition(prisma as never);
  const shareAnalytics = buildShareAnalyticsComposition(prisma as never, logger, config);
  for (const binding of shareAnalytics.eventHandlers ?? []) {
    eventBus.on(binding.eventType, binding.handler);
  }

  // Integration.
  const upload = buildUploadComposition(s3, prisma as never, logger);

  // Onboarding renders a live résumé preview from saved progress (the
  // resume-style picker). It builds the GenericResume itself and delegates
  // the AST compile + HTML render to the export BC's html generator —
  // reusing the exact pipeline the Resume tab preview uses.
  const cacheLock = new InMemoryCacheLockAdapter();
  // Render the user's in-progress résumé as HTML in the chosen style by
  // delegating to the export BC's html generator (same pipeline as the
  // Resume tab preview). Typed via OnboardingDeps so `input` isn't `any`.
  const renderOnboardingResumeHtml: NonNullable<OnboardingDeps['renderResumeHtml']> = (input) =>
    exportBc.useCases.resumeHtmlGenerator.generateFromResume(input);
  const onboarding = buildOnboardingComposition({
    prisma: prisma as never,
    logger,
    auditLog,
    cacheLock: cacheLock as never,
    sseStream,
    // Reject onboarding locations that aren't real geo entries.
    validateLocation: (label: string) => geo.lookup.locationExists(label),
    renderResumeHtml: renderOnboardingResumeHtml,
  } as never) as never;

  // Resumes sub-BCs. `versionService` comes from resume-versions;
  // `cacheInvalidation` is a thin POJO over CachePort + LoggerPort.
  // `flags` is the real `FeatureFlagService` from the feature-flags
  // BC (see construction above). Shared with resume-quality + job-match.
  const cacheInvalidation = new CacheInvalidationService(cache, logger);
  const flags = featureFlags.useCases.featureFlagService;
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
  const timeCapsule = buildTimeCapsuleComposition(
    prisma as never,
    emailService,
    logger,
    cron,
    distributedLock,
  );

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
    // `exportBc.useCases` is the export HTTP bundle (`ExportHttpBundle`); the
    // actual `ExportUseCases` bag (with `exportPdfUseCase`) is nested one level
    // deeper at `.useCases`. Passing the bundle made the style-preview adapter
    // dereference `undefined.exportPdfUseCase` (500 on `…/preview.pdf`).
    exportBc.useCases.useCases as never,
    eventBus,
    logger,
  ) as never;

  // Skills catalog (parent + sub-BCs).
  const skillsCatalog = buildSkillsCatalogCompositions(prisma as never, cache as never, logger);
  const skillsCatalogAdmin = buildAdminCatalogUseCases(prisma as never, logger);

  // Translation — provider is the BC AI's TranslationLlmPort (OpenAI).
  const translation = buildTranslationComposition(ai.bundle.translation, logger) as never;

  // MEC sync — public catalog routes (`/api/v1/mec/...`).
  const mecSync = buildMecSyncUseCases(prisma as never, cache, logger);

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

  // P0-017: subscribe the Match-cache invalidator to JobUpdatedEvent.
  // Sync attempt + BullMQ fallback (see handler doc for the pattern).
  const cacheInvalidationQueue = new BullMQCacheInvalidationAdapter(queue);
  // The processor side: register a worker on `cache-invalidation` that
  // applies queued invalidations against the cache.
  queue.register<CacheInvalidationJob>(CACHE_INVALIDATION_QUEUE, async ({ data }) => {
    await applyCacheInvalidation(cache as never, data);
  });
  const invalidateMatchOnJobUpdated = new InvalidateMatchCacheOnJobUpdatedHandler(
    cache as never,
    cacheInvalidationQueue,
    logger,
  );
  eventBus.on(
    JobUpdatedEvent.TYPE,
    invalidateMatchOnJobUpdated.handle.bind(invalidateMatchOnJobUpdated) as never,
  );

  // P1-035: wire the four audit handlers (auth/export/social/version)
  // against their respective DomainEvents.
  //
  // Handlers are wrapped via `bindAuditListener` (defined just below)
  // — async listeners' rejections are no longer dropped into Node's
  // unhandledRejection sink; they're caught + logged with structured
  // metadata, and the AuditLogService routes FK-violation races to
  // `AuditLogLost` (compliance trail preserved without breaking the
  // HTTP flow that already succeeded for the user). See
  // docs/audits/integration-test-triage-2026-05-21.md bug #4.
  //
  // `auditPort` instantiated earlier so user-preferences UCs can audit.
  const bindAuditListener = <T>(
    eventType: string,
    handler: (event: T) => Promise<void>,
    ctx: string,
  ): void => {
    eventBus.on(
      eventType as never,
      ((event: T) => {
        // Listeners on `EventEmitter` are invoked synchronously; the
        // returned Promise is otherwise orphaned. We attach a `.catch`
        // so failures land in the logger pipeline instead of
        // `process.on('unhandledRejection')`. In `NODE_ENV=test`,
        // `trackPendingHandler` also registers the Promise in a
        // bootstrap-shared set so the test setup can `await` them in
        // `afterEach` (eliminates "unhandled error between tests").
        const work = handler(event).catch((err: unknown) => {
          logger.error(`Audit listener ${ctx} failed`, {
            context: ctx,
            stack: err instanceof Error ? err.stack : undefined,
            eventType,
            reason: err instanceof Error ? err.message : String(err),
          });
        });
        trackPendingHandler(work);
      }) as never,
    );
  };

  // Test-only: enable pending-handler tracking so the integration
  // setup's `afterEach` can drain async handlers before the next
  // test starts. Cheap no-op in prod.
  if (process.env.NODE_ENV === 'test') {
    enablePendingHandlerTracking();
  }

  const authAudit = new AuthAuditHandler(auditPort, logger);
  bindAuditListener(
    'auth.login.failed',
    authAudit.onLoginFailed.bind(authAudit),
    'AuthAudit.onLoginFailed',
  );
  bindAuditListener(
    'auth.user.logged_in',
    authAudit.onUserLoggedIn.bind(authAudit),
    'AuthAudit.onUserLoggedIn',
  );
  bindAuditListener(
    'auth.user.logged_out',
    authAudit.onUserLoggedOut.bind(authAudit),
    'AuthAudit.onUserLoggedOut',
  );
  bindAuditListener(
    'auth.session.created',
    authAudit.onSessionCreated.bind(authAudit),
    'AuthAudit.onSessionCreated',
  );
  bindAuditListener(
    'auth.session.terminated',
    authAudit.onSessionTerminated.bind(authAudit),
    'AuthAudit.onSessionTerminated',
  );
  bindAuditListener(
    'auth.token.refreshed',
    authAudit.onTokenRefreshed.bind(authAudit),
    'AuthAudit.onTokenRefreshed',
  );
  // Touch the imported event classes so the static analyser sees the
  // dependency (handler params reference them by type only).
  void LoginFailedEvent;
  void UserLoggedInEvent;
  void UserLoggedOutEvent;
  void SessionCreatedEvent;
  void SessionTerminatedEvent;
  void TokenRefreshedEvent;

  const exportAudit = new ExportAuditHandler(auditPort, logger);
  bindAuditListener(
    ExportRequestedEvent.TYPE,
    exportAudit.onRequested.bind(exportAudit),
    'ExportAudit.onRequested',
  );
  bindAuditListener(
    ExportCompletedEvent.TYPE,
    exportAudit.onCompleted.bind(exportAudit),
    'ExportAudit.onCompleted',
  );
  bindAuditListener(
    ExportFailedEvent.TYPE,
    exportAudit.onFailed.bind(exportAudit),
    'ExportAudit.onFailed',
  );

  const socialAudit = new SocialAuditHandler(auditPort, logger);
  bindAuditListener(
    UserFollowedEvent.TYPE,
    socialAudit.onUserFollowed.bind(socialAudit),
    'SocialAudit.onUserFollowed',
  );
  bindAuditListener(
    ConnectionRequestedEvent.TYPE,
    socialAudit.onConnectionRequested.bind(socialAudit),
    'SocialAudit.onConnectionRequested',
  );
  bindAuditListener(
    ShareDownloadedEvent.TYPE,
    socialAudit.onShareDownloaded.bind(socialAudit),
    'SocialAudit.onShareDownloaded',
  );

  const versionAudit = new VersionAuditHandler(auditPort, logger);
  bindAuditListener(
    VersionCreatedEvent.TYPE,
    versionAudit.onVersionCreated.bind(versionAudit),
    'VersionAudit.onVersionCreated',
  );
  bindAuditListener(
    VersionRestoredEvent.TYPE,
    versionAudit.onVersionRestored.bind(versionAudit),
    'VersionAudit.onVersionRestored',
  );

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
  // The SSE adapter exposes its in-process listener count via the
  // `sse` probe so operators can spot a leak (or a stuck disconnect)
  // without scraping Prometheus. `status: 'ok'` always; the probe is
  // gauge-style, not pass/fail.
  const health = buildHealthComposition({
    prisma: prisma as never,
    cache,
    version: config.getOrDefault<string>('APP_VERSION', '0.0.0-dev'),
    startedAt: new Date(),
    extraProbes: [
      async () => ({
        name: 'sse',
        status: 'ok' as const,
        latencyMs: 0,
        detail: `listeners=${sseStream.totalListenerCount()}`,
      }),
    ],
  });

  // Config BC — exposes server-side constants the frontend mirrors
  // (PASSWORD_POLICY today; future: feature flags, etc.).
  const platformConfig = buildConfigComposition();

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
    // P1 #2 / #12 — feed the lockout status reader to the pipeline so
    // routes that declare `guards: [{ id: 'auth-lockout' }]` short-
    // circuit with 423 before reaching the handler. The use-case still
    // runs its own check (it's the source of truth and the only path
    // that records new failed attempts).
    loginAttempts: authenticationUseCases.loginAttempts,
    ownershipRegistry,
    featureFlags: flags,
    internalApiToken: config.env.INTERNAL_API_TOKEN,
    metricsKey: config.env.PROMETHEUS_KEY ?? config.env.INTERNAL_API_TOKEN,
    // P1-023 — feed every request's wall-clock into the dormant
    // `api_latency_seconds` histogram via the metrics BC. The
    // pipeline already times each request for the access log; this
    // observer reuses the same measurement.
    observeApiLatency: (durationSeconds, labels) => {
      metrics.metrics.observeApiLatency(durationSeconds, labels);
    },
    // P1-follow-up: domain gates for auto-apply routes. fit-profile
    // is satisfied when the cached status is `'responded'` (the only
    // non-blocking state). min-quality reads the most-recent
    // `ResumeQualityScoreHistory` row for the user's primary resume.
    hasValidFitProfile: async (userId: string): Promise<boolean> => {
      const status = await fitProfileBundle.useCases.getFitProfileStatus.execute(userId);
      return status.status === 'responded';
    },
    meetsMinQuality: async (userId: string): Promise<boolean> => {
      const MIN_OVERALL_SCORE = 70;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { primaryResumeId: true },
      });
      if (!user?.primaryResumeId) return false;
      const latest = await prisma.resumeQualityScoreHistory.findFirst({
        where: { resumeId: user.primaryResumeId },
        select: { overallScore: true },
        orderBy: { computedAt: 'desc' },
      });
      if (!latest) return false;
      return latest.overallScore >= MIN_OVERALL_SCORE;
    },
  });

  // --- Mount routes on Elysia ---
  // CORS + security-header defaults are wired here so they apply to
  // every route uniformly. P1 #11 — `buildCorsAllowlist` always
  // returns an explicit array, NEVER `true` (which would have echoed
  // the caller's Origin under `credentials: true`). Production /
  // staging boots fail-fast if no allowlist is configured.
  const app = new Elysia();
  const isProduction = config.env.NODE_ENV === 'production';
  // V2 D43: `buildCorsAllowlist` now auto-includes the Expo dev
  // origins (localhost:8081/19000/19006 + `https://*.expo.dev`) in
  // non-production so the RN/Expo app can hit the API without
  // operator-side env tweaks. Production stays operator-controlled
  // (CORS_ORIGIN only). `enableCors` compiles wildcard strings to
  // RegExp internally before handing the list to `@elysiajs/cors`.
  const allowlist = buildCorsAllowlist(config);
  enableCors(app, { origin: allowlist, isProduction });
  applySecurityHeaders(app);
  for (const bc of [
    badges,
    successStories,
    careerGraph,
    uiMetadata,
    realtime,
    featureFlags,
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
    platformConfig,
  ] as const) {
    mountRoutes(app, { bundle: bc.useCases, routes: bc.routes }, { prefix: '/api', pipeline });
  }

  // BCs whose composition functions return raw useCases instead of
  // `{ useCases, routes }`. We import the route arrays directly and
  // mount them against the bundle the route file expects.
  const extra: ReadonlyArray<{ bundle: unknown; routes: unknown }> = [
    { bundle: githubIntegration, routes: githubRoutes },
    { bundle: accountLifecycle, routes: accountLifecycleRoutes },
    {
      bundle: (authenticationUseCases as { bundle: unknown }).bundle,
      routes: authenticationRoutes,
    },
    { bundle: emailVerification, routes: emailVerificationRoutes },
    { bundle: passwordManagement, routes: passwordManagementRoutes },
    { bundle: (users as { bundle: unknown }).bundle, routes: usersRoutes },
    {
      bundle: shadowProfile,
      routes: shadowProfileRoutes,
    },
    { bundle: uiState, routes: uiStateRoutes },
    { bundle: geo.useCases, routes: geo.routes },
    { bundle: companies.useCases, routes: companies.routes },
    { bundle: roles.useCases, routes: roles.routes },
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
    { bundle: featureFlags.sseBundle, routes: featureFlags.sseRoutes },
    { prefix: '/api', pipeline },
  );
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

  // V2 D75: Mobile Universal Links / App Links discovery files.
  // Mounted at the **root** path (no `/api` prefix) because Apple's
  // and Google's crawlers expect them at `https://<host>/.well-known/…`.
  const wellKnown = buildWellKnownComposition(config, logger);
  mountRoutes(
    app,
    { bundle: wellKnown.useCases, routes: wellKnown.routes },
    { prefix: '', pipeline },
  );

  // --- Run lifecycles.init in order ---
  for (const l of lifecycles) await l.init?.();

  // P1 #49: read PORT via ConfigPort. The canonical EnvConfigSchema
  // already coerces / validates the value so we don't go through
  // process.env a second time and skip the schema floor.
  const port = config.env.PORT ?? 3010;
  app.listen(port);
  logger.log(`Elysia listening on http://localhost:${port}`, 'ElysiaBootstrap');
  logger.log(
    `Try: curl http://localhost:${port}/api/v1/badges/user/test-user-id`,
    'ElysiaBootstrap',
  );

  // --- SIGTERM / SIGINT: drain via OnShutdownPort (Q36) ---
  // Forward each lifecycle.dispose into the orchestrator. Tasks are
  // registered in reverse-init order so the *registration* ordering
  // mirrors the original semantics; with `BEST_EFFORT` the orchestrator
  // still runs them concurrently but the per-task timeout (5s default)
  // bounds any single hung dispose, which the original sequential loop
  // could not — a stuck Prisma disconnect would have blocked Redis quit
  // forever.
  let lifecycleSeq = 0;
  for (const l of [...lifecycles].reverse()) {
    if (!l.dispose) continue;
    const inferred = l.constructor?.name;
    const name = inferred && inferred !== 'Object' ? inferred : `lifecycle-${lifecycleSeq++}`;
    onShutdown.register({
      name,
      run: async () => {
        await l.dispose?.();
      },
    });
  }

  let stopped = false;
  const drainLifecycles = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    await onShutdown.shutdown('BEST_EFFORT');
  };
  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal}, shutting down...`, 'ElysiaBootstrap');
    // Stop accepting new HTTP traffic before draining so in-flight
    // requests complete against still-live downstream resources.
    try {
      await app.stop();
    } catch (err) {
      logger.error(`app.stop() failed: ${err instanceof Error ? err.message : String(err)}`, {
        context: 'ElysiaBootstrap',
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    await drainLifecycles();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  return {
    app,
    prisma,
    cache,
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
