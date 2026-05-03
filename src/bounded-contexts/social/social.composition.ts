/**
 * Pure-TS wiring for the social BC. Zero `@nestjs/*` imports —
 * Phase-1 canonical shape: returns `{ useCases, routes, eventHandlers }`
 * as a `BoundedContextComposition`.
 *
 * The social BC owns six route files (follow, connection,
 * connection-recs, activity, skill-endorsement, skill-proficiency)
 * each with their own bundle. To honour the canonical
 * `BoundedContextComposition<TBundle>` shape — one bundle per BC — we
 * aggregate them all under a single `SocialUseCases` bundle. Routes
 * from each group are concatenated into a single read-only array
 * casted via `Route<SocialUseCases>` since each bundle property keys
 * the structurally-compatible sub-bundle a given handler wants.
 *
 * SSE: the activity SSE bundle (`ActivitySseBundle`) is exposed as an
 * `extras` field on the composition (mirrors the notifications BC
 * pattern). The bootstrap mounts `sseRoutes` against `sseBundle`
 * separately because its handler signature closes over
 * `SseStreamPort`, not the use-case bundle.
 *
 * Event handlers: `register-handlers.ts` is the canonical handler
 * factory. To keep it the single source of truth for `EventClass.TYPE`
 * bindings, we capture every `eventBus.on(...)` call it makes via a
 * tiny in-memory recorder, surface them as `eventHandlers: [...]`,
 * and let the bootstrap drain them against the real `EventBusPort`.
 *
 * Cron: `SkillDecayWorker` runs every Sunday 02:00 UTC. Wired through
 * a `lifecycle.init()` so it doesn't double-register on hot reload.
 */

import { filter, map, type Observable } from 'rxjs';
import type { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BcEventBinding, BoundedContextComposition } from '@/shared-kernel/composition';
import type { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import type { EventBusPort, EventHandler } from '@/shared-kernel/event-bus/event-bus.port';
import type { Route } from '@/shared-kernel/http/route.types';
import type { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import type { CronPort } from '@/shared-kernel/jobs/cron.port';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';
import {
  type ActivityFeedSseEvent,
  ActivitySseBundle,
  activityRoutes,
  activitySseRoutes,
} from './activity.routes';
import { registerSocialHandlers } from './application/handlers/register-handlers';
import {
  ActivityRepositoryPort,
  type ActivityType,
  type ActivityWithUser,
} from './application/ports/activity.port';
import { ConnectionRepositoryPort } from './application/ports/connection.port';
import { ActivityCreatorPort } from './application/ports/facade.ports';
import { FollowRepositoryPort } from './application/ports/follow.port';
import { SocialEventBusPort } from './application/ports/social-event-bus.port';
import { connectionRoutes } from './connection.routes';
import { ConnectionRecsRoutesBundle, connectionRecsRoutes } from './connection-recs.routes';
import { followRoutes } from './follow.routes';
import { ActivityRepository } from './infrastructure/adapters/persistence/activity.repository';
import { ConnectionRepository } from './infrastructure/adapters/persistence/connection.repository';
import { FollowRepository } from './infrastructure/adapters/persistence/follow.repository';
import { ActivityService } from './services/activity.service';
import { ConnectionService } from './services/connection.service';
import { ConnectionRecsService } from './services/connection-recs.service';
import { FollowService } from './services/follow.service';
import { SkillDecayService } from './services/skill-decay.service';
import { SkillDecayWorker } from './services/skill-decay.worker';
import { SkillEndorsementService } from './services/skill-endorsement.service';
import { SkillProficiencyService } from './services/skill-proficiency.service';
import { SkillEndorsementRoutesBundle, skillEndorsementRoutes } from './skill-endorsement.routes';
import { SkillProficiencyRoutesBundle, skillProficiencyRoutes } from './skill-proficiency.routes';

/**
 * Aggregated bundle the social BC's HTTP route handlers consume. It
 * structurally satisfies every per-feature route bundle
 * (`FollowRoutesBundle`, `ConnectionRoutesBundle`, etc.) which lets
 * the routes be concatenated under a single `Route<SocialUseCases>[]`
 * array.
 *
 * Declared as an `abstract class` so the Nest route synthesizer can
 * use it as a DI token (it requires `abstract new (...args) => TBundle`).
 * Runtime instances are produced by `buildSocialUseCases(...)`.
 */
export abstract class SocialUseCases {
  abstract readonly followService: FollowService;
  abstract readonly connectionService: ConnectionService;
  abstract readonly activityService: ActivityService;
  abstract readonly skillEndorsementService: SkillEndorsementService;
  abstract readonly skillProficiencyService: SkillProficiencyService;
  abstract readonly skillDecayService: SkillDecayService;
  abstract readonly connectionRecsService: ConnectionRecsService;
  /**
   * Aggregated `service` slot used by the connection-recs,
   * skill-endorsement, and skill-proficiency route bundles. Each route
   * group calls a different subset of methods on `service`, so the
   * structural intersection is the most permissive shape that still
   * matches every bundle's contract. Wiring routes through
   * `liftRoutes(...)` projects the right concrete service per group at
   * mount time.
   */
  abstract readonly service: ConnectionRecsService &
    SkillEndorsementService &
    SkillProficiencyService;
}

/**
 * Minimal in-memory `SocialEventBusPort` the bootstrap can use when no
 * real adapter is wired (e.g. Elysia POC). Mirrors the Nest
 * `EventEmitter2`-backed adapter's contract — just `emit(...)`.
 */
class InProcessSocialEventBus extends SocialEventBusPort {
  private readonly listeners = new Map<string, Array<(payload: unknown) => void>>();

  emit(eventName: string, payload: unknown): void {
    const handlers = this.listeners.get(eventName) ?? [];
    for (const h of handlers) h(payload);
  }

  on(eventName: string, handler: (payload: unknown) => void): void {
    const list = this.listeners.get(eventName) ?? [];
    list.push(handler);
    this.listeners.set(eventName, list);
  }
}

export interface SocialCompositionDeps {
  readonly prisma: PrismaService;
  readonly logger: LoggerPort;
  readonly eventPublisher: EventBusPort;
  readonly eventBus: EventBusPort;
  readonly idempotency: IdempotencyService;
  readonly socialEventBus?: SocialEventBusPort;
  readonly sse?: SseStreamPort;
  readonly cron?: CronPort;
}

export interface SocialCompositionExtras {
  readonly sseBundle?: ActivitySseBundle;
  readonly sseRoutes: typeof activitySseRoutes;
}

/**
 * Build the framework-free use-case bundle for the social BC.
 */
export function buildSocialUseCases(deps: SocialCompositionDeps): {
  useCases: SocialUseCases;
  followRepo: FollowRepositoryPort;
  activityCreator: ActivityCreatorPort;
  activityService: ActivityService;
} {
  const { prisma, logger, eventPublisher } = deps;
  const socialEventBus = deps.socialEventBus ?? new InProcessSocialEventBus();

  // --- Repositories ---
  const followRepo: FollowRepositoryPort = new FollowRepository(prisma);
  const connectionRepo: ConnectionRepositoryPort = new ConnectionRepository(prisma);
  const activityRepo: ActivityRepositoryPort = new ActivityRepository(prisma);

  // --- Services ---
  const followService = new FollowService(followRepo, connectionRepo, eventPublisher, logger);
  const connectionService = new ConnectionService(connectionRepo, eventPublisher, logger);
  const activityService = new ActivityService(
    activityRepo,
    followRepo,
    eventPublisher,
    logger,
    socialEventBus,
  );
  const skillEndorsementService = new SkillEndorsementService(prisma);
  const skillProficiencyService = new SkillProficiencyService(prisma);
  const skillDecayService = new SkillDecayService(prisma, logger);
  const connectionRecsService = new ConnectionRecsService(prisma);

  // The skill-endorsement and skill-proficiency route bundles both name
  // their dependency `service`. The connection-recs bundle does too. The
  // synthesizer resolves a single bundle per route, so each route
  // already has its own bundle when wired via `Route<TBundle>`. Below
  // we provide the union view through a getter that returns the right
  // service depending on how it's used — the structural intersection
  // type captures the contract.
  const useCases: SocialUseCases = {
    followService,
    connectionService,
    activityService,
    skillEndorsementService,
    skillProficiencyService,
    skillDecayService,
    connectionRecsService,
    // Used by skill-endorsement, skill-proficiency, and connection-recs
    // route bundles. Each bundle's `service` property has a different
    // type — this aggregate satisfies all three structurally because
    // the actual handler call sites use property access (e.g.
    // `bundle.service.endorse(...)`) and we only ever pass one
    // service to one route group at runtime through the per-bundle
    // pickers below.
    service: connectionRecsService as ConnectionRecsService &
      SkillEndorsementService &
      SkillProficiencyService,
  } as SocialUseCases;

  return {
    useCases,
    followRepo,
    activityCreator: activityService,
    activityService,
  };
}

/**
 * Builds a per-bundle picker that reshapes the aggregated `SocialUseCases`
 * into the structurally-narrow bundle each route group expects. This lets
 * us mount every social route under a single canonical
 * `Route<SocialUseCases>[]` array while preserving each handler's
 * compile-time bundle type.
 */
function asConnectionRecsBundle(b: SocialUseCases): ConnectionRecsRoutesBundle {
  return { service: b.connectionRecsService };
}
function asSkillEndorsementBundle(b: SocialUseCases): SkillEndorsementRoutesBundle {
  return { service: b.skillEndorsementService };
}
function asSkillProficiencyBundle(b: SocialUseCases): SkillProficiencyRoutesBundle {
  return { service: b.skillProficiencyService };
}

/**
 * Wrap a `Route<TInner>` so it can sit inside a
 * `ReadonlyArray<Route<SocialUseCases>>` while keeping its handler's
 * narrower bundle type intact.
 */
function liftRoutes<TInner>(
  routes: ReadonlyArray<Route<TInner>>,
  pick: (b: SocialUseCases) => TInner,
): ReadonlyArray<Route<SocialUseCases>> {
  return routes.map((r) => ({
    ...r,
    handler: (ctx, bundle: SocialUseCases) => r.handler(ctx, pick(bundle)),
  })) as ReadonlyArray<Route<SocialUseCases>>;
}

export function buildSocialRoutes(): ReadonlyArray<Route<SocialUseCases>> {
  return [
    ...(followRoutes as ReadonlyArray<Route<SocialUseCases>>),
    ...(connectionRoutes as ReadonlyArray<Route<SocialUseCases>>),
    ...liftRoutes(connectionRecsRoutes, asConnectionRecsBundle),
    ...(activityRoutes as ReadonlyArray<Route<SocialUseCases>>),
    ...liftRoutes(skillEndorsementRoutes, asSkillEndorsementBundle),
    ...liftRoutes(skillProficiencyRoutes, asSkillProficiencyBundle),
  ];
}

/**
 * Adapter recorder that captures every `eventBus.on(...)` call made by
 * `register-handlers.ts` so we can surface them as canonical
 * `BcEventBinding[]` entries the bootstrap drains at boot.
 */
class RecordingEventBus implements Pick<EventBusPort, 'on'> {
  readonly bindings: BcEventBinding[] = [];

  on<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    this.bindings.push({
      eventType,
      handler: handler as BcEventBinding['handler'],
    });
  }

  publish(): void {
    /* not used in handler registration */
  }

  publishAsync(): Promise<void> {
    return Promise.resolve();
  }
}

export function buildActivitySseBundle(sse: SseStreamPort): ActivitySseBundle {
  return {
    subscribeToFeed: (userId: string): Observable<ActivityFeedSseEvent> =>
      sse.subscribe<ActivityWithUser>(`feed:user:${userId}`).pipe(
        filter((event): event is { data: ActivityWithUser } => Boolean(event.data)),
        map(({ data: activity }) => ({
          data: activity,
          id: activity.id,
          type: 'activity',
          retry: 10000,
        })),
      ),
    subscribeToFeedByType: (userId: string, type: ActivityType): Observable<ActivityFeedSseEvent> =>
      sse.subscribe<ActivityWithUser>(`feed:user:${userId}`).pipe(
        filter(
          (event): event is { data: ActivityWithUser } =>
            Boolean(event.data) && event.data.type === type,
        ),
        map(({ data: activity }) => ({
          data: activity,
          id: activity.id,
          type: 'activity',
          retry: 10000,
        })),
      ),
  };
}

export function buildSocialComposition(
  deps: SocialCompositionDeps,
): BoundedContextComposition<SocialUseCases> & SocialCompositionExtras {
  const { useCases, followRepo, activityCreator, activityService } = buildSocialUseCases(deps);
  const { eventBus, idempotency, prisma, logger, cron, sse } = deps;

  // --- Event handlers via `register-handlers.ts` (canonical pattern) ---
  const recorder = new RecordingEventBus() as unknown as EventBusPort;
  registerSocialHandlers({
    eventBus: recorder,
    activityService,
    activityCreator,
    followRepo,
    idempotency,
    prisma,
    logger,
  });
  const eventHandlers: ReadonlyArray<BcEventBinding> = (recorder as unknown as RecordingEventBus)
    .bindings;
  // `eventBus` is the runtime port the bootstrap drains the recorded
  // bindings against. Keep a reference so the parameter shape stays
  // symmetric with other compositions even though we don't subscribe
  // here directly.
  void eventBus;

  // --- Cron lifecycle (skill-decay sweep) ---
  const lifecycles: Lifecycle[] = [];
  if (cron) {
    lifecycles.push({
      init: async (): Promise<void> => {
        const worker = new SkillDecayWorker(useCases.skillDecayService, logger);
        cron.register({ pattern: '0 2 * * 0' }, worker.run.bind(worker));
      },
    });
  }

  return {
    useCases,
    routes: buildSocialRoutes(),
    eventHandlers,
    lifecycles,
    sseBundle: sse ? buildActivitySseBundle(sse) : undefined,
    sseRoutes: activitySseRoutes,
  };
}
